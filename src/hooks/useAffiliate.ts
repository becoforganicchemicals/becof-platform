import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const MIN_PAYOUT_KES = 1000;

export interface Affiliate {
  id: string;
  user_id: string;
  code: string | null;
  status: string;
  commission_rate: number;
  business_name: string | null;
  mpesa_phone: string | null;
  application_note: string | null;
  admin_note: string | null;
  applied_at: string;
  reviewed_at: string | null;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  order_id: string;
  order_total: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  payout_id: string | null;
  created_at: string;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount: number;
  mpesa_phone: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
}

export const useAffiliate = () => {
  const { user } = useAuth();

  const { data: affiliate, isLoading: affiliateLoading, refetch: refetchAffiliate } = useQuery({
    queryKey: ["affiliate", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data as Affiliate | null;
    },
    enabled: !!user,
  });

  const { data: commissions = [], refetch: refetchCommissions } = useQuery({
    queryKey: ["affiliate-commissions", affiliate?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select("*")
        .eq("affiliate_id", affiliate!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AffiliateCommission[];
    },
    enabled: !!affiliate?.id,
  });

  const { data: payouts = [], refetch: refetchPayouts } = useQuery({
    queryKey: ["affiliate-payouts", affiliate?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_payouts")
        .select("*")
        .eq("affiliate_id", affiliate!.id)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as AffiliatePayout[];
    },
    enabled: !!affiliate?.id,
  });

  // Payable + not yet attached to a payout request = available to request now.
  const availableBalance = commissions
    .filter(c => c.status === "payable" && !c.payout_id)
    .reduce((s, c) => s + Number(c.commission_amount), 0);
  // Payable + already attached to a pending payout = awaiting admin processing.
  const pendingPayoutBalance = commissions
    .filter(c => c.status === "payable" && c.payout_id)
    .reduce((s, c) => s + Number(c.commission_amount), 0);
  const paidTotal = commissions
    .filter(c => c.status === "paid")
    .reduce((s, c) => s + Number(c.commission_amount), 0);
  const lifetimeEarned = commissions
    .filter(c => c.status !== "void")
    .reduce((s, c) => s + Number(c.commission_amount), 0);

  const refetch = () => { refetchAffiliate(); refetchCommissions(); refetchPayouts(); };

  return {
    affiliate, commissions, payouts, affiliateLoading,
    availableBalance, pendingPayoutBalance, paidTotal, lifetimeEarned,
    refetch,
  };
};
