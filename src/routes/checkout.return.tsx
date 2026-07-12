import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const [status, setStatus] = useState<"waiting" | "ready" | "timeout">("waiting");

  useEffect(() => {
    if (!session_id) { setStatus("timeout"); return; }
    let cancelled = false;
    let attempts = 0;
    const env = getStripeEnvironment();
    async function poll() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setStatus("timeout"); return; }
      const { data } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("environment", env)
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) { setStatus("ready"); return; }
      attempts += 1;
      if (attempts >= 15) { setStatus("timeout"); return; }
      setTimeout(poll, 1000);
    }
    poll();
    return () => { cancelled = true; };
  }, [session_id]);

  return (
    <div className="min-h-screen bg-gradient-night flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-20 w-20 rounded-full bg-gradient-pitch flex items-center justify-center shadow-glow-green">
          {status === "waiting" ? (
            <Loader2 className="h-10 w-10 text-primary-foreground animate-spin" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
          )}
        </div>
        <div>
          <h1 className="font-display text-4xl">
            {status === "waiting" ? "PROCESSANDO..." : "VOCÊ É APOIADOR!"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {status === "waiting"
              ? "Confirmando seu pagamento. Isso leva alguns segundos."
              : status === "timeout"
              ? "Pagamento recebido. A confirmação ainda está chegando — sua carteirinha aparece em instantes."
              : "Sua assinatura foi confirmada. Bem-vindo à torcida oficial."}
          </p>
        </div>
        <div className="space-y-3">
          <Link
            to="/carteirinha"
            className={`flex items-center justify-center gap-2 w-full bg-gradient-gold text-gold-foreground font-display text-xl py-4 rounded-2xl shadow-glow-gold ${status === "waiting" ? "opacity-60 pointer-events-none" : ""}`}
          >
            <Ticket className="h-5 w-5" /> VER CARTEIRINHA
          </Link>
          <Link to="/home" className="block text-sm text-primary py-2">
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}