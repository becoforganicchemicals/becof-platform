import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[] | null;
    stock_quantity: number;
    slug: string;
    sku: string | null;
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  subtotal: number;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  items: [],
  loading: false,
  itemCount: 0,
  subtotal: 0,
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeFromCart: async () => {},
  clearCart: async () => {},
});

export const useCart = () => useContext(CartContext);

// ── Guest (signed-out) cart — kept client-side only, never touches the
// cart_items table (which is RLS-scoped to auth.uid() and has no anon
// access, deliberately, to keep a signed-in user's cart private). A guest's
// cart is just a list of product ids + quantities in localStorage, hydrated
// against live product data on read so price/stock/image are always current.
const GUEST_CART_KEY = "becof-guest-cart";

type GuestCartEntry = { product_id: string; quantity: number };

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
      .select("id, name, price, images, stock_quantity, slug, sku")
      .in("id", entries.map(e => e.product_id));

    const productMap = new Map((products || []).map(p => [p.id, p]));
    // Drop entries for products that no longer exist/are unpublished
    // (deleted, or auto-unpublished at 0 stock) — same convention as the
    // signed-in cart filtering out a deleted product's join.
    const stillValid = entries.filter(e => productMap.has(e.product_id));
    if (stillValid.length !== entries.length) writeGuestCart(stillValid);

    setItems(stillValid.map(e => ({
      id: e.product_id,
      product_id: e.product_id,
      quantity: e.quantity,
      product: productMap.get(e.product_id)!,
    })));
    setLoading(false);
  }, []);

  const fetchCart = useCallback(async () => {
    if (!user) { await fetchGuestCart(); return; }
    setLoading(true);
    const { data } = await supabase
      .from("cart_items")
      .select("id, product_id, quantity, products(id, name, price, images, stock_quantity, slug, sku)")
      .eq("user_id", user.id);
    if (data) {
      // Filter out cart items whose product has been deleted (products join returns null)
      setItems(
        data
          .filter((d: any) => d.products != null)
          .map((d: any) => ({ ...d, product: d.products }))
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
        const { data: existing } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", user.id)
          .eq("product_id", entry.product_id)
          .maybeSingle();
        if (existing) {
          await supabase.from("cart_items").update({ quantity: existing.quantity + entry.quantity }).eq("id", existing.id);
        } else {
          await supabase.from("cart_items").insert({ user_id: user.id, product_id: entry.product_id, quantity: entry.quantity });
        }
      }
      writeGuestCart([]);
      fetchCart();
    })();
  }, [user, fetchCart]);

  const addToCart = async (productId: string, quantity = 1) => {
    if (!user) {
      const entries = readGuestCart();
      const existing = entries.find(e => e.product_id === productId);
      if (existing) existing.quantity += quantity;
      else entries.push({ product_id: productId, quantity });
      writeGuestCart(entries);
      toast.success("Added to cart");
      await fetchGuestCart();
      return;
    }
    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      await updateQuantity(productId, existing.quantity + quantity);
      return;
    }
    const { error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity });
    if (error) { toast.error("Failed to add to cart"); return; }
    toast.success("Added to cart");
    fetchCart();
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) { await removeFromCart(productId); return; }
    if (!user) {
      const entries = readGuestCart();
      const existing = entries.find(e => e.product_id === productId);
      if (!existing) return;
      existing.quantity = quantity;
      writeGuestCart(entries);
      await fetchGuestCart();
      return;
    }
    const { error } = await supabase.from("cart_items").update({ quantity }).eq("user_id", user.id).eq("product_id", productId);
    if (error) { toast.error("Failed to update cart"); return; }
    fetchCart();
  };

  const removeFromCart = async (productId: string) => {
    if (!user) {
      writeGuestCart(readGuestCart().filter(e => e.product_id !== productId));
      toast.success("Removed from cart");
      await fetchGuestCart();
      return;
    }
    await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
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
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, loading, itemCount, subtotal, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
