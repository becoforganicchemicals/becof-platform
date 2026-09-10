import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const DISMISSED_KEY = "dismissed-pending-orders";

const readDismissed = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

// Surfaces the customer's most recent unpaid standard order (created in the
// last 24h) on /cart and /checkout, so retrying goes through the existing
// order (same shipping + coupon already locked in) instead of silently
// creating a duplicate order from scratch.
const PendingOrderBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);

  const { data: pendingOrder } = useQuery({
    queryKey: ["pending-standard-order", user?.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("id, total_amount, created_at")
        .eq("user_id", user!.id)
        .eq("order_type", "standard")
        .neq("payment_status", "paid")
        .neq("status", "cancelled")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  if (!pendingOrder || dismissed.has(pendingOrder.id)) return null;

  const dismiss = () => {
    setDismissed(prev => {
      const next = new Set(prev).add(pendingOrder.id);
      try { sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex-wrap">
      <div className="flex items-center gap-3">
        <Clock className="h-5 w-5 text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            You have an order awaiting payment — KES {pendingOrder.total_amount?.toLocaleString()}
          </p>
          <p className="text-xs text-amber-700">Order #{pendingOrder.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={dismiss}>Start New Order</Button>
        <Button size="sm" onClick={() => navigate("/checkout", { state: { resumeOrderId: pendingOrder.id } })}>
          Resume Payment
        </Button>
      </div>
    </div>
  );
};

export default PendingOrderBanner;
