import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { RequireAuth } from "@/components/RequireAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  adminListPayouts,
  adminMarkPayout,
  adminAllTeamsBalances,
  getMyDirectorTeam,
  getTeamFinancials,
  requestPayout,
  updateTeamPix,
} from "@/lib/mercadopago.functions";
import {
  CheckCircle2,
  Loader2,
  Wallet,
  Users,
  TrendingUp,
  Clock,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/financeiro")({
  component: () => (
    <RequireAuth>
      <Financeiro />
    </RequireAuth>
  ),
});

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PIX_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave aleatória" },
] as const;

function Financeiro() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [tab, setTab] = useState<"team" | "admin" | "repasses">("team");

  if (roleLoading) {
    return (
      <MobileShell>
        <TopBar title="FINANCEIRO" back="/admin" />
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline" /> Carregando…
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <TopBar title="FINANCEIRO" back="/admin" />
      {isAdmin && (
        <div className="px-4 pt-3 flex gap-2 flex-wrap">
          <button
            onClick={() => setTab("team")}
            className={`flex-1 py-2 rounded-xl text-xs font-display border ${tab === "team" ? "bg-card border-primary text-primary" : "border-border text-muted-foreground"}`}
          >MEU TIME</button>
          <button
            onClick={() => setTab("admin")}
            className={`flex-1 py-2 rounded-xl text-xs font-display border ${tab === "admin" ? "bg-card border-primary text-primary" : "border-border text-muted-foreground"}`}
          >FILA DE SAQUES</button>
          <button
            onClick={() => setTab("repasses")}
            className={`flex-1 py-2 rounded-xl text-xs font-display border ${tab === "repasses" ? "bg-card border-primary text-primary" : "border-border text-muted-foreground"}`}
          >REPASSES</button>
        </div>
      )}
      {tab === "team" && <TeamPanel />}
      {tab === "admin" && <AdminPanel />}
      {tab === "repasses" && <RepassesPanel />}
      <Link to="/admin" className="block text-center text-xs text-muted-foreground py-4 underline">
        Voltar
      </Link>
    </MobileShell>
  );
}

function TeamPanel() {
  const qc = useQueryClient();
  const getTeam = useServerFn(getMyDirectorTeam);
  const getFin = useServerFn(getTeamFinancials);
  const teamQ = useQuery({ queryKey: ["mp-my-team"], queryFn: () => getTeam() });
  const team = teamQ.data;
  const finQ = useQuery({
    queryKey: ["mp-financials", team?.id],
    queryFn: () => getFin({ data: { teamId: team!.id } }),
    enabled: !!team?.id,
  });

  if (teamQ.isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /> Carregando…</div>;
  }
  if (!team) {
    return <div className="p-6 text-sm text-muted-foreground">Você ainda não está vinculado a nenhum time como diretor.</div>;
  }

  return (
    <div className="px-4 pt-4 space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Time</p>
        <p className="font-display text-lg">{team.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KPI icon={Wallet} label="Saldo disponível" value={brl(finQ.data?.balanceCents ?? 0)} accent />
        <KPI icon={Clock} label="Saque em análise" value={brl(finQ.data?.pendingOutCents ?? 0)} />
        <KPI icon={TrendingUp} label="Últimos 30d" value={brl(finQ.data?.gross30Cents ?? 0)} />
        <KPI icon={Users} label="Apoiadores ativos" value={String(finQ.data?.activeSupporters ?? 0)} />
      </div>

      <PixForm
        teamId={team.id}
        initialKey={team.pix_key}
        initialType={team.pix_key_type as any}
        onSaved={() => qc.invalidateQueries({ queryKey: ["mp-my-team"] })}
      />

      <PayoutForm
        teamId={team.id}
        balance={finQ.data?.balanceCents ?? 0}
        defaultPix={team.pix_key}
        defaultPixType={team.pix_key_type as any}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["mp-financials", team.id] });
        }}
      />

      <section>
        <h2 className="font-display text-lg mb-2">SAQUES</h2>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {(finQ.data?.payouts ?? []).length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nenhum saque solicitado ainda.</p>
          )}
          {(finQ.data?.payouts ?? []).map((p) => (
            <div key={p.id} className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{brl(p.amount_cents)}</p>
                <PayoutBadge status={p.status} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {new Date(p.requested_at).toLocaleString("pt-BR")} · PIX {p.pix_key_type}: {p.pix_key}
              </p>
              {p.proof_url && (
                <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline mt-1 inline-block">
                  Ver comprovante
                </a>
              )}
              {p.notes && <p className="text-[11px] text-muted-foreground mt-1">Obs: {p.notes}</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">ÚLTIMOS PAGAMENTOS</h2>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {(finQ.data?.payments ?? []).length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nenhum pagamento ainda.</p>
          )}
          {(finQ.data?.payments ?? []).map((p, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold">{brl(p.amount_cents)}</p>
                <p className="text-[11px] text-muted-foreground uppercase">
                  {p.payment_method ?? "—"} · {p.status} · {p.paid_at ? new Date(p.paid_at).toLocaleDateString("pt-BR") : "—"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Líquido: <span className="text-foreground font-semibold">{brl(p.net_team_cents)}</span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PixForm({ teamId, initialKey, initialType, onSaved }: {
  teamId: string;
  initialKey: string | null;
  initialType: "cpf" | "cnpj" | "email" | "phone" | "random" | null;
  onSaved: () => void;
}) {
  const save = useServerFn(updateTeamPix);
  const [pix, setPix] = useState(initialKey ?? "");
  const [type, setType] = useState<typeof PIX_TYPES[number]["value"]>(initialType ?? "cpf");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await save({ data: { teamId, pixKey: pix.trim(), pixKeyType: type } });
      toast.success("Chave PIX salva");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="font-display text-base">CHAVE PIX PADRÃO</p>
      <p className="text-xs text-muted-foreground">É pra onde a plataforma vai mandar os saques. Pode sobrescrever em cada solicitação.</p>
      <div className="grid grid-cols-3 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="bg-background border border-border rounded-lg px-2 py-2 text-sm">
          {PIX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input value={pix} onChange={(e) => setPix(e.target.value)} placeholder="Chave PIX" className="col-span-2 bg-background border border-border rounded-lg px-3 py-2 text-sm" maxLength={140} />
      </div>
      <button disabled={saving || !pix.trim()} className="w-full bg-secondary text-secondary-foreground py-2 rounded-xl text-sm font-display disabled:opacity-60">
        {saving ? "Salvando…" : "SALVAR CHAVE"}
      </button>
    </form>
  );
}

function PayoutForm({ teamId, balance, defaultPix, defaultPixType, onCreated }: {
  teamId: string;
  balance: number;
  defaultPix: string | null;
  defaultPixType: "cpf" | "cnpj" | "email" | "phone" | "random" | null;
  onCreated: () => void;
}) {
  const req = useServerFn(requestPayout);
  const [amount, setAmount] = useState("");
  const [overridePix, setOverridePix] = useState(false);
  const [pix, setPix] = useState("");
  const [type, setType] = useState<typeof PIX_TYPES[number]["value"]>(defaultPixType ?? "cpf");
  const [submitting, setSubmitting] = useState(false);

  const minCents = 10000;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!Number.isFinite(amountCents) || amountCents < minCents) {
      toast.error("Valor mínimo: R$ 100,00");
      return;
    }
    if (amountCents > balance) {
      toast.error("Acima do saldo disponível");
      return;
    }
    const finalPix = overridePix ? pix.trim() : (defaultPix ?? "");
    const finalType = overridePix ? type : (defaultPixType ?? "cpf");
    if (!finalPix) {
      toast.error("Cadastre uma chave PIX padrão ou informe abaixo");
      return;
    }
    setSubmitting(true);
    try {
      await req({ data: { teamId, amountCents, pixKey: finalPix, pixKeyType: finalType } });
      toast.success("Saque solicitado! Vai ser processado manualmente em até 2 dias úteis.");
      setAmount(""); setOverridePix(false); setPix("");
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-gold/40 bg-gold/5 p-4 space-y-3">
      <p className="font-display text-base">SOLICITAR SAQUE</p>
      <p className="text-xs text-muted-foreground">Mínimo R$ 100,00. Saldo disponível: <span className="text-foreground font-semibold">{brl(balance)}</span></p>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Valor (R$)"
        inputMode="decimal"
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={overridePix} onChange={(e) => setOverridePix(e.target.checked)} />
        Usar uma chave PIX diferente da padrão
      </label>
      {overridePix && (
        <div className="grid grid-cols-3 gap-2">
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="bg-background border border-border rounded-lg px-2 py-2 text-sm">
            {PIX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input value={pix} onChange={(e) => setPix(e.target.value)} placeholder="Chave PIX" className="col-span-2 bg-background border border-border rounded-lg px-3 py-2 text-sm" maxLength={140} />
        </div>
      )}
      {!overridePix && defaultPix && (
        <p className="text-[11px] text-muted-foreground">Vai cair em: <span className="text-foreground">{defaultPix}</span> ({defaultPixType})</p>
      )}
      <button disabled={submitting || balance < minCents} className="w-full bg-gradient-gold text-gold-foreground py-3 rounded-xl font-display disabled:opacity-60 flex items-center justify-center gap-2">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        SOLICITAR SAQUE
      </button>
    </form>
  );
}

function AdminPanel() {
  const qc = useQueryClient();
  const list = useServerFn(adminListPayouts);
  const mark = useServerFn(adminMarkPayout);
  const [filter, setFilter] = useState<"pending" | "paid" | "rejected" | "all">("pending");
  const q = useQuery({
    queryKey: ["admin-payouts", filter],
    queryFn: () => list({ data: { status: filter } }),
  });

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="flex gap-2 text-[11px]">
        {(["pending", "paid", "rejected", "all"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full border ${filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            {s === "pending" ? "Pendentes" : s === "paid" ? "Pagos" : s === "rejected" ? "Rejeitados" : "Todos"}
          </button>
        ))}
      </div>
      {q.isLoading && <p className="text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline" /> Carregando…</p>}
      {q.data?.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma solicitação.</p>}
      <div className="space-y-2">
        {(q.data ?? []).map((p: any) => (
          <AdminPayoutRow key={p.id} payout={p} onAction={async (action, proofUrl, notes) => {
            try {
              await mark({ data: { payoutId: p.id, action, proofUrl, notes } });
              toast.success(action === "paid" ? "Marcado como pago" : "Rejeitado");
              qc.invalidateQueries({ queryKey: ["admin-payouts"] });
            } catch (e: any) {
              toast.error(e?.message ?? "Erro");
            }
          }} />
        ))}
      </div>
    </div>
  );
}

function AdminPayoutRow({ payout, onAction }: {
  payout: any;
  onAction: (action: "paid" | "rejected", proofUrl?: string, notes?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-base">{brl(Number(payout.amount_cents))}</p>
          <p className="text-[11px] text-muted-foreground">{payout.team_name}</p>
        </div>
        <PayoutBadge status={payout.status} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        PIX {payout.pix_key_type}: <span className="text-foreground">{payout.pix_key}</span>
      </p>
      <p className="text-[11px] text-muted-foreground">
        Solicitado em {new Date(payout.requested_at).toLocaleString("pt-BR")}
      </p>
      {payout.proof_url && (
        <a href={payout.proof_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline">Ver comprovante</a>
      )}
      {payout.notes && <p className="text-[11px] text-muted-foreground">Obs: {payout.notes}</p>}

      {payout.status === "pending" && (
        <>
          {!open ? (
            <button onClick={() => setOpen(true)} className="mt-3 w-full bg-secondary text-secondary-foreground py-2 rounded-lg text-xs font-display">
              PROCESSAR
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <input value={proof} onChange={(e) => setProof(e.target.value)} placeholder="URL do comprovante (opcional)" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs" maxLength={500} />
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações (opcional)" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs" maxLength={1000} rows={2} />
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={async () => { setBusy(true); await onAction("paid", proof || undefined, notes || undefined); setBusy(false); setOpen(false); }}
                  className="flex-1 bg-gradient-pitch text-primary-foreground py-2 rounded-lg text-xs font-display disabled:opacity-60"
                >
                  MARCAR PAGO
                </button>
                <button
                  disabled={busy}
                  onClick={async () => { setBusy(true); await onAction("rejected", undefined, notes || undefined); setBusy(false); setOpen(false); }}
                  className="flex-1 bg-destructive/10 text-destructive border border-destructive/40 py-2 rounded-lg text-xs font-display disabled:opacity-60"
                >
                  REJEITAR
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PayoutBadge({ status }: { status: string }) {
  if (status === "paid") {
    return <span className="text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pago</span>;
  }
  if (status === "rejected") {
    return <span className="text-[10px] uppercase tracking-wider bg-destructive/15 text-destructive border border-destructive/30 px-2 py-0.5 rounded-full flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejeitado</span>;
  }
  return <span className="text-[10px] uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="h-3 w-3" /> Pendente</span>;
}

function RepassesPanel() {
  const list = useServerFn(adminAllTeamsBalances);
  const q = useQuery({ queryKey: ["admin-balances"], queryFn: () => list() });

  if (q.isLoading) return <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /> Calculando saldos…</div>;
  if (q.error) return <p className="p-4 text-sm text-destructive">Erro ao carregar.</p>;
  const data = q.data!;

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total a repassar agora</p>
        <p className="font-display text-3xl text-gold">{brl(data.totals.balance)}</p>
        <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
          <div><p className="text-muted-foreground">Bruto</p><p className="font-semibold text-foreground">{brl(data.totals.gross)}</p></div>
          <div><p className="text-muted-foreground">Taxa plataforma</p><p className="font-semibold text-foreground">{brl(data.totals.fee)}</p></div>
          <div><p className="text-muted-foreground">Líquido times</p><p className="font-semibold text-foreground">{brl(data.totals.net)}</p></div>
          <div><p className="text-muted-foreground">Já pago</p><p className="font-semibold text-foreground">{brl(data.totals.paid)}</p></div>
          <div><p className="text-muted-foreground">Em análise</p><p className="font-semibold text-foreground">{brl(data.totals.pending)}</p></div>
        </div>
      </div>

      <div className="space-y-2">
        {data.rows.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">Nenhum time com movimentação.</p>}
        {data.rows.map((r) => (
          <div key={r.team_id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-base truncate">{r.team_name}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Taxa {r.fee_percent}% · {r.pix_key ? `PIX ${r.pix_key_type}: ${r.pix_key}` : "Sem chave PIX"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo a repassar</p>
                <p className={`font-display text-lg ${r.balance_cents > 0 ? "text-gold" : "text-muted-foreground"}`}>{brl(r.balance_cents)}</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1 mt-3 text-center text-[10px]">
              <Cell label="Bruto" value={brl(r.gross_cents)} />
              <Cell label="Taxa" value={brl(r.fee_cents)} />
              <Cell label="Líquido" value={brl(r.net_cents)} />
              <Cell label="Pago" value={brl(r.paid_cents)} />
              <Cell label="Pendente" value={brl(r.pending_cents)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background border border-border rounded-lg py-1.5 px-1">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-foreground font-semibold mt-0.5 truncate">{value}</p>
    </div>
  );
}

function KPI({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? "bg-gradient-gold border-gold/40 text-gold-foreground" : "bg-card border-border"}`}>
      <Icon className={`h-5 w-5 ${accent ? "text-gold-foreground" : "text-primary"}`} />
      <p className="font-display text-xl mt-2 leading-none">{value}</p>
      <p className={`text-[10px] uppercase tracking-wider mt-1 ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
    </div>
  );
}