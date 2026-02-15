import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
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

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("cart_items")
      .select("id, product_id, quantity, products(id, name, price, images, stock_quantity, slug)")
      .eq("user_id", user.id);
    if (data) {
      setItems(data.map((d: any) => ({ ...d, product: d.products })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (productId: string, quantity = 1) => {
    if (!user) { toast.error("Please sign in to add items to cart"); return; }
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
    if (!user) return;
    if (quantity <= 0) { await removeFromCart(productId); return; }
    const { error } = await supabase.from("cart_items").update({ quantity }).eq("user_id", user.id).eq("product_id", productId);
    if (error) { toast.error("Failed to update cart"); return; }
    fetchCart();
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
    toast.success("Removed from cart");
    fetchCart();
  };

  const clearCart = async () => {
    if (!user) return;
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
