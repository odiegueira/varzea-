import { createFileRoute } from "@tanstack/react-router";
import { fetchPreapproval, getAdmin, processMpPayment } from "@/lib/mercadopago.server";

async function handlePreapproval(preapprovalId: string, teamHint: string | null) {
  const pre: any = await fetchPreapproval(preapprovalId);
  const status = pre.status as string;
  const externalRef = (pre.external_reference ?? "") as string;
  const [refTeam, refUser, refTier] = externalRef.split(/[:|]/);
  const finalTeamId = teamHint ?? refTeam ?? null;
  const userId = refUser || null;
  const mappedStatus =
    status === "authorized" ? "active"
    : status === "cancelled" ? "canceled"
    : status === "paused" ? "paused"
    : status;
  if (!finalTeamId || !userId) return;
  const amountCents = Math.round(Number(pre.auto_recurring?.transaction_amount ?? 0) * 100);
  await getAdmin().from("subscriptions").upsert({
    user_id: userId,
    team_id: finalTeamId,
    stripe_subscription_id: preapprovalId,
    stripe_customer_id: String(pre.payer_id ?? ""),
    product_id: refTier ?? "mp_preapproval",
    price_id: refTier ?? "mp_preapproval",
    unit_amount: amountCents,
    status: mappedStatus,
    current_period_end: pre.next_payment_date ?? null,
    environment: "sandbox",
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });
}

export const Route = createFileRoute("/api/public/mp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const teamId = url.searchParams.get("team");
        let body: any = {};
        try { body = await request.json(); } catch {}
        const type = (body?.type ?? body?.topic ?? url.searchParams.get("type") ?? "") as string;
        const dataId = (body?.data?.id ?? body?.id ?? url.searchParams.get("id") ?? null) as string | null;
        if (!dataId) return Response.json({ received: true, ignored: "no id" });
        try {
          if (type === "payment" || type === "payment.updated" || type === "payment.created") {
            await processMpPayment(String(dataId), teamId);
          } else if (type === "subscription_preapproval" || type === "preapproval" || type === "subscription_authorized_payment") {
            await handlePreapproval(String(dataId), teamId);
          } else {
            console.log("MP webhook unhandled type:", type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("MP webhook error:", e);
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});