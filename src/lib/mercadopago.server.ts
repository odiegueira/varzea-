import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MP_API = "https://api.mercadopago.com";

let _admin: SupabaseClient | null = null;
export function getAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _admin;
}

export function getPlatformAccessToken() {
  const v = process.env.MP_PLATFORM_ACCESS_TOKEN;
  if (!v) throw new Error("MP_PLATFORM_ACCESS_TOKEN não configurado");
  return v;
}

const DEFAULT_FEE_PCT = 0.10;
const PIX_VALIDITY_DAYS = 30;

async function getTeamFeePct(teamId: string): Promise<number> {
  const { data } = await getAdmin().from("teams").select("platform_fee_percent").eq("id", teamId).maybeSingle();
  const pct = Number((data as any)?.platform_fee_percent);
  return Number.isFinite(pct) && pct >= 0 ? pct / 100 : DEFAULT_FEE_PCT;
}

export async function processMpPayment(paymentId: string, teamHint: string | null) {
  const payment: any = await fetchPayment(paymentId);
  const status = payment.status as string;
  const amount = Math.round(Number(payment.transaction_amount ?? 0) * 100);
  const method = payment.payment_type_id === "credit_card" ? "credit_card"
    : payment.payment_type_id === "bank_transfer" ? "pix"
    : payment.payment_type_id ?? null;
  const externalRef = (payment.external_reference ?? "") as string;
  const [refTeam, refUser, refTier] = externalRef.split(/[:|]/);
  const finalTeamId = teamHint ?? refTeam ?? null;
  const userId = refUser || null;
  const preapprovalId = (payment.metadata?.preapproval_id ?? payment.preapproval_id ?? null) as string | null;
  const paidAt = (payment.date_approved ?? payment.date_created) as string | null;

  if (!finalTeamId) return { status, approved: false };

  const feePct = await getTeamFeePct(finalTeamId);
  const fee = Math.round(amount * feePct);
  const net = Math.max(0, amount - fee);

  await getAdmin().from("mp_payments").upsert({
    team_id: finalTeamId,
    user_id: userId,
    mp_payment_id: String(paymentId),
    mp_preapproval_id: preapprovalId,
    status,
    amount_cents: amount,
    platform_fee_cents: fee,
    net_team_cents: net,
    payment_method: method,
    paid_at: paidAt,
    raw: payment,
    environment: "sandbox",
  }, { onConflict: "mp_payment_id" });

  if (status === "approved" && preapprovalId && userId) {
    await getAdmin().from("subscriptions").upsert({
      user_id: userId,
      team_id: finalTeamId,
      stripe_subscription_id: preapprovalId,
      stripe_customer_id: String(payment.payer?.id ?? ""),
      product_id: refTier ?? "mp_preapproval",
      price_id: refTier ?? "mp_preapproval",
      unit_amount: amount,
      status: "active",
      current_period_start: paidAt,
      current_period_end: new Date(Date.now() + PIX_VALIDITY_DAYS * 24 * 3600 * 1000).toISOString(),
      environment: "sandbox",
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_subscription_id" });
  }

  if (status === "approved" && !preapprovalId && userId && method === "pix") {
    const tierKey = refTier || "pix";
    const stableId = `pix|${finalTeamId}|${userId}|${tierKey}`;
    const startMs = paidAt ? new Date(paidAt).getTime() : Date.now();
    await getAdmin().from("subscriptions").upsert({
      user_id: userId,
      team_id: finalTeamId,
      stripe_subscription_id: stableId,
      stripe_customer_id: String(payment.payer?.id ?? ""),
      product_id: tierKey,
      price_id: tierKey,
      unit_amount: amount,
      status: "active",
      current_period_start: paidAt,
      current_period_end: new Date(startMs + PIX_VALIDITY_DAYS * 24 * 3600 * 1000).toISOString(),
      environment: "sandbox",
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_subscription_id" });
  }

  return { status, approved: status === "approved" };
}

const STABLE_PREVIEW_ORIGIN = "https://id-preview--829372c0-5984-464f-974d-edb953d5e201.lovable.app";
const STABLE_PRODUCTION_ORIGIN = "https://varzea-plus-uniaoplay.lovable.app";

export function getStableAppOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.hostname === "varzea-plus-uniaoplay.lovable.app") return STABLE_PRODUCTION_ORIGIN;
    if (
      url.hostname === "id-preview--829372c0-5984-464f-974d-edb953d5e201.lovable.app" ||
      url.hostname.endsWith("lovableproject.com") ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    ) {
      return STABLE_PREVIEW_ORIGIN;
    }
    return url.origin;
  } catch {
    return STABLE_PREVIEW_ORIGIN;
  }
}

export async function createPlatformPreapproval(opts: {
  payerEmail: string;
  reason: string;
  amount: number;
  externalReference: string;
  backUrl: string;
  notificationUrl: string;
}) {
  // MP rejeita caracteres especiais e acentos no reason. Mantemos apenas
  // ASCII alfanumérico + espaço para evitar "invalid_field_content".
  const safeReason = opts.reason
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 200)
    .trim() || "Apoio mensal";
  const baseBody = {
    reason: safeReason,
    external_reference: opts.externalReference,
    back_url: opts.backUrl,
    notification_url: opts.notificationUrl,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: Number(opts.amount.toFixed(2)),
      currency_id: "BRL",
    },
    status: "pending",
  };
  async function send(includePayerEmail: boolean) {
    const body = includePayerEmail ? { ...baseBody, payer_email: opts.payerEmail } : baseBody;
    const res = await fetch(`${MP_API}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getPlatformAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return { res, txt: await res.text() };
  }

  let { res, txt } = await send(true);
  if (!res.ok && txt.includes("invalid_field_content")) {
    // Em sandbox, o Mercado Pago costuma rejeitar payer_email que não é usuário
    // de teste. Sem esse campo, o checkout pede login/email ao apoiador.
    ({ res, txt } = await send(false));
  }
  if (!res.ok) {
    const hint = txt.includes("invalid_field_content") || txt.includes("invalid_payer")
      ? " — O Mercado Pago rejeitou algum dado do checkout. Confira se a conta de teste do pagador é válida e diferente da conta recebedora."
      : "";
    throw new Error(`MP preapproval failed (${res.status}): ${txt}${hint}`);
  }
  const json = JSON.parse(txt) as { id: string; init_point?: string; status: string };
  if (!json.init_point) {
    throw new Error(
      "Mercado Pago não devolveu o link de checkout (init_point ausente). " +
      "Verifique se o email do apoiador é diferente do email da conta Mercado Pago da plataforma."
    );
  }
  return json as { id: string; init_point: string; status: string };
}

export async function createPlatformPixPayment(opts: {
  payerEmail: string;
  amount: number;
  description: string;
  externalReference: string;
  notificationUrl: string;
}) {
  const body = {
    transaction_amount: Number(opts.amount.toFixed(2)),
    description: opts.description,
    payment_method_id: "pix",
    payer: { email: opts.payerEmail },
    external_reference: opts.externalReference,
    notification_url: opts.notificationUrl,
  };
  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPlatformAccessToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": opts.externalReference,
    },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`MP PIX failed (${res.status}): ${txt}`);
  const json = JSON.parse(txt);
  return {
    id: String(json.id),
    qr_code: json.point_of_interaction?.transaction_data?.qr_code as string | undefined,
    qr_code_base64: json.point_of_interaction?.transaction_data?.qr_code_base64 as string | undefined,
    ticket_url: json.point_of_interaction?.transaction_data?.ticket_url as string | undefined,
    status: json.status as string,
  };
}

export async function fetchPayment(id: string) {
  const res = await fetch(`${MP_API}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${getPlatformAccessToken()}` },
  });
  if (!res.ok) throw new Error(`MP fetch payment failed (${res.status})`);
  return res.json();
}

export async function createPlatformPreference(opts: {
  payerEmail: string;
  title: string;
  amount: number;
  externalReference: string;
  backUrl: string;
  notificationUrl: string;
}) {
  const safeTitle = opts.title
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 200)
    .trim() || "Apoio mensal";
  const body: any = {
    items: [
      {
        title: safeTitle,
        quantity: 1,
        unit_price: Number(opts.amount.toFixed(2)),
        currency_id: "BRL",
      },
    ],
    payer: { email: opts.payerEmail },
    external_reference: opts.externalReference,
    notification_url: opts.notificationUrl,
    back_urls: {
      success: opts.backUrl,
      pending: opts.backUrl,
      failure: opts.backUrl,
    },
    auto_return: "approved",
    payment_methods: {
      excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
      installments: 12,
    },
    statement_descriptor: "APOIO TIME",
  };
  async function send(includePayer: boolean) {
    const payload = includePayer ? body : { ...body, payer: undefined };
    const res = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getPlatformAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return { res, txt: await res.text() };
  }
  let { res, txt } = await send(true);
  if (!res.ok && txt.includes("invalid")) {
    ({ res, txt } = await send(false));
  }
  if (!res.ok) throw new Error(`MP preference failed (${res.status}): ${txt}`);
  const json = JSON.parse(txt) as { id: string; init_point?: string; sandbox_init_point?: string };
  const initPoint = json.init_point || json.sandbox_init_point;
  if (!initPoint) throw new Error("Mercado Pago não devolveu o link de checkout.");
  return { id: json.id, init_point: initPoint };
}

export async function fetchPreapproval(id: string) {
  const res = await fetch(`${MP_API}/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${getPlatformAccessToken()}` },
  });
  if (!res.ok) throw new Error(`MP fetch preapproval failed (${res.status})`);
  return res.json();
}