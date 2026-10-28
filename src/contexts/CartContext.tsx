import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { formatSize, maxPacks, unitOf, type PackSize } from "@/lib/packs";

// One cart line per product + pack size. Quantity is a number of packs; stock
// is in the product's unit (L, kg or g) and shared by every pack size of the same product.
export interface CartItem {
  id: string; // cart_items row id, or "productId:variantId" for a guest
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[] | null;
    stock_quantity: number;
    slug: string;
    sku: string | null;
    unit: string; // L, kg or g — see packs.ts
  };
  pack: PackSize & { id: string | null };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  subtotal: number;
  // Amount of a product already in the cart, in its unit (all pack sizes)
  amountInCart: (productId: string) => number;
  // Without a variantId, adds the product's smallest (1 L) pack.
  addToCart: (productId: string, quantity?: number, variantId?: string) => Promise<void>;
  // Several packs at once (calculator "add to cart"). Resolves true on success.
  addPacksToCart: (lines: { productId: string; variantId: string; quantity: number }[]) => Promise<boolean>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeFromCart: (lineId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  items: [],
  loading: false,
  itemCount: 0,
  subtotal: 0,
  amountInCart: () => 0,
  addToCart: async () => {},
  addPacksToCart: async () => false,
  updateQuantity: async () => {},
  removeFromCart: async () => {},
  clearCart: async () => {},
});

export const useCart = () => useContext(CartContext);

const PRODUCT_FIELDS = "id, name, price, images, stock_quantity, slug, sku, unit";

// A cart_items row with its product and pack joined
interface CartRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  products: CartItem["product"] | null;
  product_variants: PackSize | null;
}
const PACK_FIELDS = "id, size_liters, price, sku, is_active";

// Cart lines created before pack sizes existed have no variant: treat them
// as the product's 1 L pack at its listed price.
const legacyPack = (product: CartItem["product"]): CartItem["pack"] => ({
  id: null, size_liters: 1, price: product.price, sku: product.sku,
});

// ── Guest (signed-out) cart — kept client-side only, never touches the
// cart_items table (which is RLS-scoped to auth.uid() and has no anon
// access, deliberately, to keep a signed-in user's cart private). A guest's
// cart is a list of product + pack ids and quantities in localStorage,
// hydrated against live product data on read so price/stock/image are current.
const GUEST_CART_KEY = "becof-guest-cart";

type GuestCartEntry = { product_id: string; variant_id?: string | null; quantity: number };

const readGuestCart = (): GuestCartEntry[] => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeGuestCart = (entries: GuestCartEntry[]) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
};

// The pack to add, plus the product's stock, so a request for more than is in
// stock can be refused before it reaches the cart.
const resolvePack = async (productId: string, variantId?: string) => {
  const { data } = await supabase
    .from("products")
    .select(`stock_quantity, unit, product_variants (${PACK_FIELDS})`)
    .eq("id", productId)
    .maybeSingle();
  if (!data) return null;
  const packs = ((data.product_variants || []) as PackSize[]).filter((p) => p.is_active !== false);
  const pack = variantId
    ? packs.find((p) => p.id === variantId)
    : [...packs].sort((a, b) => a.size_liters - b.size_liters)[0];
  return { pack: pack || null, stock: data.stock_quantity as number, unit: unitOf(data.unit) };
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  // Tracks the user id a guest-cart merge has already run for, so signing in
  // doesn't re-merge on every re-render — only once per actual sign-in.
  const mergedForUserId = useRef<string | null>(null);

  const fetchGuestCart = useCallback(async () => {
    const entries = readGuestCart();
    if (entries.length === 0) { setItems([]); return; }

    setLoading(true);
    const { data: products } = await supabase
      .from("products")
      .select(`${PRODUCT_FIELDS}, product_variants (${PACK_FIELDS})`)
      .in("id", [...new Set(entries.map(e => e.product_id))]);

    const productMap = new Map((products || []).map(p => [p.id, p]));
    // Resolve each entry to a live pack. Entries saved before pack sizes
    // existed (no variant_id) become the 1 L pack; duplicates are merged.
    // Products that no longer exist/are unpublished, and pack sizes that were
    // withdrawn, are dropped — same as the signed-in cart.
    const lines = new Map<string, CartItem>();
    for (const e of entries) {
      const product = productMap.get(e.product_id);
      if (!product) continue;
      const packs = ((product.product_variants || []) as PackSize[]).filter(p => p.is_active !== false);
      const { product_variants: _packs, ...productFields } = product;
      const pack = e.variant_id
        ? packs.find(p => p.id === e.variant_id)
        : [...packs].sort((a, b) => a.size_liters - b.size_liters)[0] ?? legacyPack(productFields);
      if (!pack) continue;
      const key = `${e.product_id}:${pack.id}`;
      const existing = lines.get(key);
      if (existing) existing.quantity += e.quantity;
      else lines.set(key, {
        id: key, product_id: e.product_id, variant_id: pack.id, quantity: e.quantity,
        product: productFields, pack,
      });
    }
    const resolved = [...lines.values()];
    writeGuestCart(resolved.map(l => ({ product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity })));
    setItems(resolved);
    setLoading(false);
  }, []);

  const fetchCart = useCallback(async () => {
    if (!user) { await fetchGuestCart(); return; }
    setLoading(true);
    const { data } = await supabase
      .from("cart_items")
      .select(`id, product_id, variant_id, quantity, products(${PRODUCT_FIELDS}), product_variants(${PACK_FIELDS})`)
      .eq("user_id", user.id);
    if (data) {
      const rows = data as unknown as CartRow[];
      // Lines whose pack size was withdrawn (join hidden by RLS) are removed,
      // so they can't block adding that size again later.
      const withdrawn = rows.filter(d => d.variant_id && !d.product_variants).map(d => d.id);
      if (withdrawn.length) await supabase.from("cart_items").delete().in("id", withdrawn);
      setItems(
        rows
          // Filter out cart items whose product has been deleted (products join returns null)
          .filter((d): d is CartRow & { products: CartItem["product"] } => d.products != null && !withdrawn.includes(d.id))
          .map(d => ({
            id: d.id,
            product_id: d.product_id,
            variant_id: d.variant_id,
            quantity: d.quantity,
            product: d.products,
            pack: d.product_variants ?? legacyPack(d.products),
          }))
      );
    }
    setLoading(false);
  }, [user, fetchGuestCart]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  // A guest who then signs in shouldn't lose whatever they'd already added —
  // fold the local guest cart into their real DB cart once, then clear it.
  useEffect(() => {
    if (!user || mergedForUserId.current === user.id) return;
    mergedForUserId.current = user.id;

    const guestEntries = readGuestCart();
    if (guestEntries.length === 0) return;

    (async () => {
      for (const entry of guestEntries) {
        let query = supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", user.id)
          .eq("product_id", entry.product_id);
        query = entry.variant_id ? query.eq("variant_id", entry.variant_id) : query.is("variant_id", null);
        const { data: existing } = await query.maybeSingle();
        if (existing) {
          await supabase.from("cart_items").update({ quantity: existing.quantity + entry.quantity }).eq("id", existing.id);
        } else {
          await supabase.from("cart_items").insert({
            user_id: user.id, product_id: entry.product_id, variant_id: entry.variant_id ?? null, quantity: entry.quantity,
          });
        }
      }
      writeGuestCart([]);
      fetchCart();
    })();
  }, [user, fetchCart]);

  const amountInCart = (productId: string) =>
    items.filter(i => i.product_id === productId).reduce((sum, i) => sum + i.pack.size_liters * i.quantity, 0);

  const addToCart = async (productId: string, quantity = 1, variantId?: string) => {
    const resolved = await resolvePack(productId, variantId);
    if (!resolved?.pack) { toast.error("This product isn't available right now"); return; }
    const { pack, stock, unit } = resolved;

    // Stock is shared by all pack sizes, so count what's already in the cart
    const available = maxPacks(pack, stock, amountInCart(productId));
    if (quantity > available) {
      const size = formatSize(pack.size_liters, unit);
      toast.error(available > 0 ? `Only ${available} more ${size} pack${available === 1 ? "" : "s"} available` : `No more ${size} packs in stock`);
      return;
    }

    const existing = items.find(i => i.product_id === productId && i.variant_id === pack.id);
    if (existing) {
      await updateQuantity(existing.id, existing.quantity + quantity);
      toast.success("Added to cart");
      return;
    }

    if (!user) {
      const entries = readGuestCart();
      entries.push({ product_id: productId, variant_id: pack.id, quantity });
      writeGuestCart(entries);
      toast.success("Added to cart");
      await fetchGuestCart();
      return;
    }
    const { error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, variant_id: pack.id, quantity });
    if (error) { toast.error("Failed to add to cart"); return; }
    toast.success("Added to cart");
    fetchCart();
  };

  const addPacksToCart = async (lines: { productId: string; variantId: string; quantity: number }[]) => {
    const wanted = lines.filter(l => l.quantity > 0);
    if (!wanted.length) return false;

    // Check stock per product against live data, counting what's already in the cart.
    const productIds = [...new Set(wanted.map(l => l.productId))];
    const { data: products } = await supabase
      .from("products")
      .select(`id, name, stock_quantity, product_variants (${PACK_FIELDS})`)
      .in("id", productIds);
    const byId = new Map((products || []).map(p => [p.id, p]));
    for (const productId of productIds) {
      const product = byId.get(productId);
      const packs = (product?.product_variants || []) as PackSize[];
      let amount = amountInCart(productId);
      for (const l of wanted.filter(w => w.productId === productId)) {
        const pack = packs.find(p => p.id === l.variantId && p.is_active !== false);
        if (!product || !pack) { toast.error("Some of these packs aren't available right now"); return false; }
        amount += pack.size_liters * l.quantity;
      }
      if (product && amount > product.stock_quantity) {
        toast.error(`Not enough ${product.name} in stock for this amount`, { description: "Contact us on WhatsApp and we'll arrange it." });
        return false;
      }
    }

    if (!user) {
      const entries = items.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity }));
      for (const l of wanted) {
        const existing = entries.find(e => e.product_id === l.productId && e.variant_id === l.variantId);
        if (existing) existing.quantity += l.quantity;
        else entries.push({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity });
      }
      writeGuestCart(entries);
      await fetchGuestCart();
    } else {
      // Read the cart fresh rather than trusting state, so each line is
      // updated or inserted exactly once.
      const { data: current } = await supabase
        .from("cart_items").select("id, product_id, variant_id, quantity").eq("user_id", user.id);
      for (const l of wanted) {
        const existing = (current || []).find(c => c.product_id === l.productId && c.variant_id === l.variantId);
        const { error } = existing
          ? await supabase.from("cart_items").update({ quantity: existing.quantity + l.quantity }).eq("id", existing.id)
          : await supabase.from("cart_items").insert({ user_id: user.id, product_id: l.productId, variant_id: l.variantId, quantity: l.quantity });
        if (error) { toast.error("Failed to add to cart"); await fetchCart(); return false; }
      }
      await fetchCart();
    }
    toast.success(wanted.length === 1 ? "Added to cart" : `Added ${wanted.length} items to cart`);
    return true;
  };

  const updateQuantity = async (lineId: string, quantity: number) => {
    if (quantity <= 0) { await removeFromCart(lineId); return; }
    const line = items.find(i => i.id === lineId);
    if (!line) return;
    const extra = (quantity - line.quantity) * line.pack.size_liters;
    if (extra > 0 && amountInCart(line.product_id) + extra > line.product.stock_quantity) {
      toast.error(`No more ${formatSize(line.pack.size_liters, unitOf(line.product.unit))} packs in stock`);
      return;
    }
    if (!user) {
      writeGuestCart(items.map(i => ({
        product_id: i.product_id, variant_id: i.variant_id, quantity: i.id === lineId ? quantity : i.quantity,
      })));
      await fetchGuestCart();
      return;
    }
    const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", lineId).eq("user_id", user.id);
    if (error) { toast.error("Failed to update cart"); return; }
    fetchCart();
  };

  const removeFromCart = async (lineId: string) => {
    if (!user) {
      writeGuestCart(items.filter(i => i.id !== lineId).map(i => ({
        product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity,
      })));
      toast.success("Removed from cart");
      await fetchGuestCart();
      return;
    }
    await supabase.from("cart_items").delete().eq("id", lineId).eq("user_id", user.id);
    toast.success("Removed from cart");
    fetchCart();
  };

  const clearCart = async () => {
    if (!user) {
      writeGuestCart([]);
      setItems([]);
      return;
    }
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    setItems([]);
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.pack.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, loading, itemCount, subtotal, amountInCart, addToCart, addPacksToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
