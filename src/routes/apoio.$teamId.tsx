import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { useTeam } from "@/hooks/useTeams";
import { TeamCrest } from "@/components/varzea/TeamCrest";
import { Check, Shield, Ticket, Loader2, QrCode, Copy, X, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMySubscriptions } from "@/hooks/useMySubscriptions";
import { createMpSubscriptionCheckout, createMpPixCharge, confirmMpPixPayment } from "@/lib/mercadopago.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/apoio/$teamId")({
  component: Apoio,
  notFoundComponent: () => <div className="p-8 text-center">Time não encontrado.</div>,
});

type Plan = {
  tier: string;
  name: string;
  priceId: string;
  amount: number;
  perks: string[];
  featured?: boolean;
  legend?: boolean;
};

const PLANS: Plan[] = [
  { tier: "Apoiador", name: "Apoiador", priceId: "apoio_apoiador_monthly", amount: 2.0, perks: ["Carteirinha digital", "Conta no ranking de apoiadores"] },
  { tier: "Bronze", name: "Sócio Bronze", priceId: "apoio_bronze_monthly", amount: 14.9, perks: ["Carteirinha digital", "Pontos por presença", "Mural da torcida"] },
  { tier: "Prata", name: "Sócio Prata", priceId: "apoio_prata_monthly", amount: 24.9, perks: ["Tudo do Bronze", "Descontos com parceiros", "Brindes exclusivos do time"], featured: true },
  { tier: "Ouro", name: "Sócio Ouro", priceId: "apoio_ouro_monthly", amount: 49.9, perks: ["Tudo do Prata", "Treinos abertos", "Camisa oficial anual", "Voto em decisões do clube"] },
  { tier: "Lenda", name: "Lenda da Várzea", priceId: "apoio_lenda_monthly", amount: 99.9, perks: ["Tudo do Ouro", "Nome eternizado no muro", "Jantar com a diretoria", "Camisa autografada"], legend: true },
];

function Apoio() {
  const { teamId } = Route.useParams();
  const { team: t, loading: teamLoading } = useTeam(teamId);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { active, loading: subsLoading, refetch: refetchSubs } = useMySubscriptions();
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const [pendingPix, setPendingPix] = useState<string | null>(null);
  const [pix, setPix] = useState<{ paymentId: string; teamId: string; qr: string; qr64?: string; ticket?: string; tier: string; amount: number } | null>(null);
  const checkout = useServerFn(createMpSubscriptionCheckout);
  const pixCharge = useServerFn(createMpPixCharge);

  const existing = t ? active.find((s) => s.team_id === t.id) : undefined;

  async function onChoose(plan: Plan) {
    if (!t) return;
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (existing) {
      toast.info("Você já apoia esse time. Gerencie pelo app do Mercado Pago.");
      window.open("https://www.mercadopago.com.br/subscriptions", "_blank");
      return;
    }
    setPendingTier(plan.tier);
    try {
      const res = await checkout({
        data: {
          teamId: t.id,
          teamName: t.name,
          tier: plan.tier,
          amount: plan.amount,
          returnUrl: `${window.location.origin}/apoio/${t.id}?status=ok`,
          origin: window.location.origin,
        },
      });
      if (res?.error) throw new Error(res.error);
      if (!res?.initPoint || !/^https?:\/\//.test(res.initPoint)) {
        throw new Error("Não recebemos o link do Mercado Pago. Tente novamente em instantes.");
      }
      window.location.href = res.initPoint;
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível iniciar o checkout.");
      setPendingTier(null);
    } finally {
      // redirect ocorre antes
    }
  }

  async function onPix(plan: Plan) {
    if (!t) return;
    if (!user) { navigate({ to: "/login" }); return; }
    setPendingPix(plan.tier);
    try {
      const res = await pixCharge({
        data: {
          teamId: t.id,
          teamName: t.name,
          tier: plan.tier,
          amount: plan.amount,
          origin: window.location.origin,
        },
      });
      if (!res.qr_code) throw new Error("PIX indisponível no momento.");
      setPix({ paymentId: String(res.id), teamId: t.id, qr: res.qr_code, qr64: res.qr_code_base64, ticket: res.ticket_url, tier: plan.tier, amount: plan.amount });
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível gerar o PIX.");
    } finally { setPendingPix(null); }
  }

  if (teamLoading) {
    return (
      <MobileShell>
        <TopBar title="APOIO MENSAL" back="/times" />
        <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
      </MobileShell>
    );
  }
  if (!t) {
    return (
      <MobileShell>
        <TopBar title="APOIO MENSAL" back="/times" />
        <p className="p-8 text-center">Time não encontrado.</p>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <TopBar title="APOIO MENSAL" back={`/times/${t.id}`} />
      <div className="px-4 pt-4 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14"><TeamCrest url={t.crest_url} name={t.name} /></div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Apoiando</p>
            <h2 className="font-display text-xl leading-tight">{t.name}</h2>
          </div>
        </div>

        {existing && (
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
            <p className="font-semibold">Você já apoia este time.</p>
            <p className="text-muted-foreground mt-1">Para trocar plano ou cancelar, acesse suas assinaturas no Mercado Pago.</p>
            <a
              href="https://www.mercadopago.com.br/subscriptions"
              target="_blank"
              rel="noreferrer"
              className="mt-3 block text-center w-full bg-gradient-gold text-gold-foreground py-3 rounded-xl font-display"
            >
              GERENCIAR NO MERCADO PAGO
            </a>
          </div>
        )}

        <div className="space-y-3">
          {PLANS.map((p) => {
            const price = p.amount.toFixed(2).replace(".", ",");
            const borderClass = p.legend
              ? "border-gold bg-card shadow-glow-gold"
              : p.featured
              ? "border-gold bg-card shadow-glow-gold"
              : "border-border bg-card";
            const isPending = pendingTier === p.tier;
            return (
              <div key={p.priceId} className={`rounded-2xl p-5 border ${borderClass}`}>
                {p.featured && !p.legend && (
                  <span className="text-[10px] uppercase tracking-widest bg-gradient-gold text-gold-foreground px-2 py-0.5 rounded-full font-bold">
                    Mais escolhido
                  </span>
                )}
                {p.legend && (
                  <span className="text-[10px] uppercase tracking-widest bg-gradient-gold text-gold-foreground px-2 py-0.5 rounded-full font-bold">
                    Para os imortais
                  </span>
                )}
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="font-display text-2xl">{p.name.toUpperCase()}</h3>
                  <p className="font-display text-2xl text-gradient-gold">R${price}<span className="text-xs text-muted-foreground">/mês</span></p>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onChoose(p)}
                  disabled={subsLoading || !!pendingTier}
                  className={`mt-4 w-full py-3 rounded-xl font-display text-lg ${
                    p.featured || p.legend
                      ? "bg-gradient-gold text-gold-foreground"
                      : "bg-gradient-pitch text-primary-foreground"
                  } disabled:opacity-60 flex items-center justify-center gap-2`}
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!user && !loading
                    ? "ENTRAR PARA APOIAR"
                    : existing
                    ? "GERENCIAR"
                    : isPending
                    ? "ABRINDO MERCADO PAGO…"
                    : "APOIAR AGORA"}
                </button>
                {!existing && (
                  <div className="mt-2">
                    <button
                      onClick={() => onPix(p)}
                      disabled={subsLoading || !!pendingPix || !!pendingTier}
                      className="w-full py-2.5 rounded-xl font-display text-sm border border-primary/40 text-primary bg-primary/5 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {pendingPix === p.tier ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                      PIX AVULSO · 30 DIAS
                    </button>
                    <p className="mt-1 text-center text-[10px] text-muted-foreground">
                      O PIX não é renovado automaticamente.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h3 className="font-display text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> APOIE QUANTOS QUISER</h3>
          <p className="text-sm text-muted-foreground">Você pode apoiar vários times. Cada apoio gera uma carteirinha digital e pontos próprios.</p>
        </div>
        <Link to="/carteirinha" className="flex items-center justify-center gap-2 text-sm text-primary py-3">
          <Ticket className="h-4 w-4" /> Ver minhas carteirinhas
        </Link>
      </div>
      {pix && (
        <PixModal
          data={pix}
          onClose={() => setPix(null)}
          onApproved={() => { refetchSubs?.(); navigate({ to: "/carteirinha" }); }}
        />
      )}
    </MobileShell>
  );
}

function PixModal({ data, onClose, onApproved }: { data: { paymentId: string; teamId: string; qr: string; qr64?: string; ticket?: string; tier: string; amount: number }; onClose: () => void; onApproved: () => void }) {
  const [approved, setApproved] = useState(false);
  const confirm = useServerFn(confirmMpPixPayment);
  const approvedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled || approvedRef.current) return;
      try {
        const r = await confirm({ data: { paymentId: data.paymentId, teamId: data.teamId } });
        if (r.approved && !approvedRef.current) {
          approvedRef.current = true;
          setApproved(true);
          toast.success("Pagamento confirmado!");
          setTimeout(() => onApproved(), 1200);
        }
      } catch {}
    };
    const id = setInterval(tick, 3000);
    tick();
    return () => { cancelled = true; clearInterval(id); };
  }, [data.paymentId, data.teamId, confirm, onApproved]);
  async function copy() {
    try { await navigator.clipboard.writeText(data.qr); toast.success("Código PIX copiado!"); }
    catch { toast.error("Não foi possível copiar."); }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Plano {data.tier}</p>
            <p className="font-display text-lg leading-tight">PIX · R$ {data.amount.toFixed(2).replace(".", ",")}</p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          {approved ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              <p className="font-display text-xl">Pagamento confirmado!</p>
              <p className="text-xs text-muted-foreground">Abrindo sua carteirinha...</p>
            </div>
          ) : (
            <>
          {data.qr64 && (
            <img src={`data:image/png;base64,${data.qr64}`} alt="QR Code PIX" className="w-full max-w-xs mx-auto rounded-xl border border-border bg-white p-2" />
          )}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">PIX Copia e Cola</p>
            <div className="bg-card border border-border rounded-lg p-2 text-[11px] break-all font-mono max-h-32 overflow-y-auto">{data.qr}</div>
          </div>
          <button onClick={copy} className="w-full bg-gradient-gold text-gold-foreground py-3 rounded-xl font-display flex items-center justify-center gap-2">
            <Copy className="h-4 w-4" /> COPIAR CÓDIGO PIX
          </button>
          {data.ticket && (
            <a href={data.ticket} target="_blank" rel="noreferrer" className="block text-center text-xs text-primary underline">Abrir no Mercado Pago</a>
          )}
          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Aguardando pagamento...
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
