import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useAuth } from "./useAuth";

export type SubRow = {
  id: string;
  user_id: string;
  team_id: string | null;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string | null;
};

export function isActive(s: Pick<SubRow, "status" | "current_period_end">): boolean {
  const future = !s.current_period_end || new Date(s.current_period_end) > new Date();
  if (["active", "trialing", "past_due"].includes(s.status) && future) return true;
  if (s.status === "canceled" && future) return true;
  return false;
}

export function useMySubscriptions() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<SubRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: rows } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false });
    setData((rows ?? []) as SubRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refetch();
  }, [authLoading, refetch]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`subs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetch]);

  const active = (data ?? []).filter(isActive);
  return { all: data ?? [], active, loading: authLoading || loading, refetch };
}