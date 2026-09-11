import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// 100 KES spent earns 1 point (on delivery); 1 point is worth KES 2 on
// redemption; redemption is capped at 10% of an order's (post-coupon) value.
export const KES_PER_POINT_EARNED = 100;
export const KES_PER_POINT_REDEEMED = 2;
export const MAX_REDEMPTION_FRACTION = 0.1;

export interface LoyaltyLedgerRow {
  id: string;
  points: number;
  type: string;
  description: string | null;
  expires_at: string | null;
  created_at: string;
}

export const useLoyaltyPoints = () => {
  const { user } = useAuth();

  const { data: ledger = [], isLoading, refetch } = useQuery({
    queryKey: ["loyalty-points", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LoyaltyLedgerRow[];
    },
    enabled: !!user,
  });

  const now = new Date();
  // Redemptions carry no expiry (expires_at is null) so they always count;
  // earn-type rows only count while unexpired.
  const balance = ledger.reduce((sum, row) => {
    const valid = !row.expires_at || new Date(row.expires_at) > now;
    return valid ? sum + row.points : sum;
  }, 0);

  return {
    ledger,
    balance,
    balanceKes: balance * KES_PER_POINT_REDEEMED,
    isLoading,
    refetch,
  };
};
