import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createPlatformPixPayment,
  createPlatformPreapproval,
  getAdmin,
  getStableAppOrigin,
  processMpPayment,
} from "./mercadopago.server";

const teamIdRe = /^[a-zA-Z0-9_-]+$/;

export const getMyDirectorTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: link } = await supabase
      .from("team_directors")
      .select("team_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!link) return null;
    const { data: team } = await getAdmin()
      .from("teams")
      .select("id, name, pix_key, pix_key_type")
      .eq("id", link.team_id)
      .maybeSingle();
    if (!team) return null;
    return team as { id: string; name: string; pix_key: string | null; pix_key_type: string | null };
  });

export const updateTeamPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      teamId: z.string().regex(teamIdRe).max(64),
      pixKey: z.string().min(1).max(140),
      pixKeyType: z.enum(["cpf", "cnpj", "email", "phone", "random"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: link } = await supabase
      .from("team_directors").select("team_id")
      .eq("user_id", userId).eq("team_id", data.teamId).maybeSingle();
    if (!link) throw new Error("Você não é diretor desse time");
    const { error } = await getAdmin().from("teams")
      .update({ pix_key: data.pixKey, pix_key_type: data.pixKeyType })
      .eq("id", data.teamId);
    if (error) throw error;
    return { ok: true };
  });

export const getTeamFinancials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ teamId: z.string().regex(teamIdRe).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: link } = await supabase
      .from("team_directors").select("team_id")
      .eq("user_id", userId).eq("team_id", data.teamId).maybeSingle();
    if (!link) throw new Error("Não autorizado");

    const admin = getAdmin();
    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const [teamRes, paymentsRes, subsRes, payoutsRes] = await Promise.all([
      admin.from("teams").select("platform_fee_percent").eq("id", data.teamId).maybeSingle(),
      admin.from("mp_payments")
        .select("amount_cents, platform_fee_cents, net_team_cents, payment_method, paid_at, status")
        .eq("team_id", data.teamId)
        .order("paid_at", { ascending: false, nullsFirst: false })
        .limit(50),
      admin.from("subscriptions")
        .select("user_id, status, unit_amount")
        .eq("team_id", data.teamId)
        .in("status", ["active", "trialing", "authorized"]),
      admin.from("payout_requests")
        .select("id, amount_cents, status, requested_at, paid_at, pix_key, pix_key_type, proof_url, notes")
        .eq("team_id", data.teamId)
        .order("requested_at", { ascending: false })
        .limit(50),
    ]);

    const feePercent = Number((teamRes.data as any)?.platform_fee_percent ?? 10);
    const payments = paymentsRes.data ?? [];
    const subs = subsRes.data ?? [];
    const payouts = payoutsRes.data ?? [];

    // Cálculo preciso por linha: usa valor armazenado se existir,
    // senão recalcula amount × (1 - fee%) com arredondamento ao centavo.
    function netOf(p: any): number {
      const stored = Number(p.net_team_cents ?? 0);
      if (stored > 0) return stored;
      const amount = Number(p.amount_cents ?? 0);
      const fee = Math.round((amount * feePercent) / 100);
      return Math.max(0, amount - fee);
    }
    function feeOf(p: any): number {
      const stored = Number(p.platform_fee_cents ?? 0);
      if (stored > 0) return stored;
      const amount = Number(p.amount_cents ?? 0);
      return Math.round((amount * feePercent) / 100);
    }

    const approved = payments.filter((p: any) => p.status === "approved");
    const grossAll = approved.reduce((s: number, p: any) => s + Number(p.amount_cents ?? 0), 0);
    const netAll = approved.reduce((s: number, p: any) => s + netOf(p), 0);
    const feeAll = approved.reduce((s: number, p: any) => s + feeOf(p), 0);
    const last30 = approved.filter((p: any) => p.paid_at && p.paid_at > since30);
    const gross30 = last30.reduce((s: number, p: any) => s + Number(p.amount_cents ?? 0), 0);
    const net30 = last30.reduce((s: number, p: any) => s + netOf(p), 0);

    const paidOut = payouts
      .filter((p: any) => p.status === "paid")
      .reduce((s: number, p: any) => s + Number(p.amount_cents ?? 0), 0);
    const pendingOut = payouts
      .filter((p: any) => p.status === "pending")
      .reduce((s: number, p: any) => s + Number(p.amount_cents ?? 0), 0);
    const balanceCents = Math.max(0, netAll - paidOut - pendingOut);

    return {
      feePercent,
      activeSupporters: subs.length,
      monthlyRecurringCents: subs.reduce((s: number, x: any) => s + Number(x.unit_amount ?? 0), 0),
      grossAllCents: grossAll,
      netAllCents: netAll,
      feeAllCents: feeAll,
      gross30Cents: gross30,
      net30Cents: net30,
      balanceCents,
      pendingOutCents: pendingOut,
      paidOutCents: paidOut,
      payments: payments.map((p: any) => ({
        amount_cents: Number(p.amount_cents ?? 0),
        net_team_cents: netOf(p),
        platform_fee_cents: feeOf(p),
        payment_method: p.payment_method as string | null,
        paid_at: p.paid_at as string | null,
        status: p.status as string,
      })),
      payouts: payouts.map((p: any) => ({
        id: p.id as string,
        amount_cents: Number(p.amount_cents ?? 0),
        status: p.status as string,
        requested_at: p.requested_at as string,
        paid_at: p.paid_at as string | null,
        pix_key: p.pix_key as string,
        pix_key_type: p.pix_key_type as string,
        proof_url: p.proof_url as string | null,
        notes: p.notes as string | null,
      })),
    };
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      teamId: z.string().regex(teamIdRe).max(64),
      amountCents: z.number().int().min(10000).max(10_000_000), // R$100 mín, R$100k máx
      pixKey: z.string().min(1).max(140),
      pixKeyType: z.enum(["cpf", "cnpj", "email", "phone", "random"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: link } = await supabase
      .from("team_directors").select("team_id")
      .eq("user_id", userId).eq("team_id", data.teamId).maybeSingle();
    if (!link) throw new Error("Não autorizado");

    const admin = getAdmin();

    // Calcula saldo disponível
    const [teamRes, paymentsRes, payoutsRes] = await Promise.all([
      admin.from("teams").select("platform_fee_percent").eq("id", data.teamId).maybeSingle(),
      admin.from("mp_payments").select("amount_cents, net_team_cents, status").eq("team_id", data.teamId),
      admin.from("payout_requests").select("amount_cents, status").eq("team_id", data.teamId),
    ]);
    const feePercent = Number((teamRes.data as any)?.platform_fee_percent ?? 10);
    const netAll = (paymentsRes.data ?? [])
      .filter((p: any) => p.status === "approved")
      .reduce((s: number, p: any) => {
        const stored = Number(p.net_team_cents ?? 0);
        if (stored > 0) return s + stored;
        const amount = Number(p.amount_cents ?? 0);
        return s + Math.max(0, amount - Math.round((amount * feePercent) / 100));
      }, 0);
    const usedOut = (payoutsRes.data ?? [])
      .filter((p: any) => p.status === "pending" || p.status === "paid")
      .reduce((s: number, p: any) => s + Number(p.amount_cents ?? 0), 0);
    const available = Math.max(0, netAll - usedOut);

    if (data.amountCents > available) {
      throw new Error(`Saldo insuficiente. Disponível: R$ ${(available / 100).toFixed(2)}`);
    }

    const { error } = await admin.from("payout_requests").insert({
      team_id: data.teamId,
      amount_cents: data.amountCents,
      pix_key: data.pixKey,
      pix_key_type: data.pixKeyType,
      status: "pending",
      requested_by: userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const adminListPayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ status: z.enum(["pending", "paid", "rejected", "all"]).default("pending") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Apenas admins");

    let q = getAdmin().from("payout_requests")
      .select("id, team_id, amount_cents, pix_key, pix_key_type, status, requested_at, paid_at, proof_url, notes")
      .order("requested_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;

    const teamIds = Array.from(new Set((rows ?? []).map((r: any) => r.team_id)));
    const { data: teams } = await getAdmin().from("teams")
      .select("id, name").in("id", teamIds.length ? teamIds : ["__none__"]);
    const nameMap = new Map((teams ?? []).map((t: any) => [t.id, t.name]));

    return (rows ?? []).map((r: any) => ({
      ...r,
      team_name: nameMap.get(r.team_id) ?? r.team_id,
    }));
  });

export const adminAllTeamsBalances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Apenas admins");

    const admin = getAdmin();
    const [teamsRes, paymentsRes, payoutsRes] = await Promise.all([
      admin.from("teams").select("id, name, platform_fee_percent, pix_key, pix_key_type").order("name"),
      admin.from("mp_payments").select("team_id, amount_cents, net_team_cents, platform_fee_cents, status"),
      admin.from("payout_requests").select("team_id, amount_cents, status"),
    ]);
    const teams = teamsRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const payouts = payoutsRes.data ?? [];

    const feeMap = new Map<string, number>(
      teams.map((t: any) => [t.id as string, Number(t.platform_fee_percent ?? 10)]),
    );
    type Agg = { gross: number; net: number; fee: number; paid: number; pending: number };
    const agg = new Map<string, Agg>();
    const get = (id: string): Agg => {
      let a = agg.get(id);
      if (!a) { a = { gross: 0, net: 0, fee: 0, paid: 0, pending: 0 }; agg.set(id, a); }
      return a;
    };

    for (const p of payments as any[]) {
      if (p.status !== "approved") continue;
      const a = get(p.team_id);
      const amount = Number(p.amount_cents ?? 0);
      const feePercent = feeMap.get(p.team_id) ?? 10;
      const storedNet = Number(p.net_team_cents ?? 0);
      const storedFee = Number(p.platform_fee_cents ?? 0);
      const fee = storedFee > 0 ? storedFee : Math.round((amount * feePercent) / 100);
      const net = storedNet > 0 ? storedNet : Math.max(0, amount - fee);
      a.gross += amount; a.net += net; a.fee += fee;
    }
    for (const r of payouts as any[]) {
      const a = get(r.team_id);
      if (r.status === "paid") a.paid += Number(r.amount_cents ?? 0);
      else if (r.status === "pending") a.pending += Number(r.amount_cents ?? 0);
    }

    const rows = teams.map((t: any) => {
      const a = get(t.id);
      const balance = Math.max(0, a.net - a.paid - a.pending);
      return {
        team_id: t.id as string,
        team_name: t.name as string,
        fee_percent: Number(t.platform_fee_percent ?? 10),
        pix_key: (t.pix_key ?? null) as string | null,
        pix_key_type: (t.pix_key_type ?? null) as string | null,
        gross_cents: a.gross,
        fee_cents: a.fee,
        net_cents: a.net,
        paid_cents: a.paid,
        pending_cents: a.pending,
        balance_cents: balance,
      };
    }).sort((x, y) => y.balance_cents - x.balance_cents);

    const totals = rows.reduce(
      (s, r) => ({
        gross: s.gross + r.gross_cents,
        fee: s.fee + r.fee_cents,
        net: s.net + r.net_cents,
        paid: s.paid + r.paid_cents,
        pending: s.pending + r.pending_cents,
        balance: s.balance + r.balance_cents,
      }),
      { gross: 0, fee: 0, net: 0, paid: 0, pending: 0, balance: 0 },
    );

    return { rows, totals };
  });

export const adminMarkPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      payoutId: z.string().uuid(),
      action: z.enum(["paid", "rejected"]),
      proofUrl: z.string().url().max(500).optional(),
      notes: z.string().max(1000).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Apenas admins");

    const { error } = await getAdmin().from("payout_requests").update({
      status: data.action,
      paid_at: data.action === "paid" ? new Date().toISOString() : null,
      paid_by: userId,
      proof_url: data.proofUrl ?? null,
      notes: data.notes ?? null,
    }).eq("id", data.payoutId);
    if (error) throw error;
    return { ok: true };
  });

export const createMpSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      teamId: z.string().regex(teamIdRe).max(64),
      teamName: z.string().min(1).max(120),
      tier: z.string().min(1).max(40),
      amount: z.number().min(1).max(5000),
      returnUrl: z.string().url().max(500),
      origin: z.string().url().max(200),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims as any)?.email as string | undefined;
    if (!email) throw new Error("Email do usuário indisponível");

    const externalRef = `${data.teamId}:${userId}:${data.tier}:${Date.now()}`;
    const stableOrigin = getStableAppOrigin(data.origin);
    const notificationUrl = `${stableOrigin}/api/public/mp/webhook?team=${encodeURIComponent(data.teamId)}`;
    const backUrl = data.returnUrl.startsWith(stableOrigin)
      ? data.returnUrl
      : data.returnUrl.replace(data.origin, stableOrigin);

    try {
      // Apoio mensal precisa nascer como assinatura recorrente. Um Checkout
      // Preference comum cobra apenas uma vez e não pode ativar recorrência.
      const pre = await createPlatformPreapproval({
        payerEmail: email,
        reason: `Apoio mensal ${data.teamName} ${data.tier}`,
        amount: data.amount,
        externalReference: externalRef,
        backUrl,
        notificationUrl,
      });
      return { initPoint: pre.init_point, preapprovalId: pre.id, error: null };
    } catch (error) {
      console.error("Falha ao criar assinatura Mercado Pago:", error);
      return {
        initPoint: null,
        preapprovalId: null,
        error: "Não foi possível criar a assinatura mensal. Confira a configuração do Mercado Pago ou tente o PIX avulso.",
      };
    }
  });

export const createMpPixCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      teamId: z.string().regex(teamIdRe).max(64),
      teamName: z.string().min(1).max(120),
      tier: z.string().min(1).max(40),
      amount: z.number().min(1).max(5000),
      origin: z.string().url().max(200),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims as any)?.email as string | undefined;
    if (!email) throw new Error("Email do usuário indisponível");
    const externalRef = `${data.teamId}:${userId}:${data.tier}:${Date.now()}`;
    const stableOrigin = getStableAppOrigin(data.origin);
    const notificationUrl = `${stableOrigin}/api/public/mp/webhook?team=${encodeURIComponent(data.teamId)}`;
    const pix = await createPlatformPixPayment({
      payerEmail: email,
      amount: data.amount,
      description: `Apoio avulso ${data.teamName} ${data.tier}`,
      externalReference: externalRef,
      notificationUrl,
    });
    return pix;
  });

export const confirmMpPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      paymentId: z.string().min(1).max(64),
      teamId: z.string().regex(teamIdRe).max(64),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const r = await processMpPayment(data.paymentId, data.teamId);
    return { status: r.status, approved: r.approved };
  });
