import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { fetchTeamsByIds, type Team } from "@/hooks/useTeams";
import { TeamCrest } from "@/components/varzea/TeamCrest";
import { QrCode, Settings, Check, Lock, Zap, TrendingUp, TrendingDown, Calendar, Users, Megaphone, Heart, Trophy, Flame } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useMySubscriptions, isActive } from "@/hooks/useMySubscriptions";
import { useAuth } from "@/hooks/useAuth";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/carteirinha")({
  component: () => (
    <RequireAuth>
      <Carteirinha />
    </RequireAuth>
  ),
});

const TIER_BY_PRICE: Record<string, { name: string; color: string }> = {
  apoio_apoiador_monthly: { name: "Apoiador", color: "bg-muted text-muted-foreground border-border" },
  apoio_bronze_monthly: { name: "Bronze", color: "bg-bronze/20 text-bronze border-bronze/40" },
  apoio_prata_monthly: { name: "Prata", color: "bg-silver/20 text-silver border-silver/40" },
  apoio_ouro_monthly: { name: "Ouro", color: "bg-gold/20 text-gold border-gold/40" },
  apoio_lenda_monthly: { name: "Lenda da Várzea", color: "bg-legend/20 text-legend border-legend/40" },
};

type TierInfo = {
  priceId: string;
  name: string;
  amount: number;
  perks: string[];
  badge: string;
};

const TIERS: TierInfo[] = [
  { priceId: "apoio_apoiador_monthly", name: "Apoiador", amount: 2.0, badge: "bg-muted text-muted-foreground border-border", perks: ["Carteirinha digital", "Conta no ranking de apoiadores"] },
  { priceId: "apoio_bronze_monthly", name: "Bronze", amount: 14.9, badge: "bg-bronze/20 text-bronze border-bronze/40", perks: ["Carteirinha digital", "Pontos por presença", "Mural da torcida"] },
  { priceId: "apoio_prata_monthly", name: "Prata", amount: 24.9, badge: "bg-silver/20 text-silver border-silver/40", perks: ["Tudo do Bronze", "Descontos com parceiros", "Brindes exclusivos do time"] },
  { priceId: "apoio_ouro_monthly", name: "Ouro", amount: 49.9, badge: "bg-gold/20 text-gold border-gold/40", perks: ["Tudo do Prata", "Treinos abertos", "Camisa oficial anual", "Voto em decisões do clube"] },
  { priceId: "apoio_lenda_monthly", name: "Lenda da Várzea", amount: 99.9, badge: "bg-legend/20 text-legend border-legend/40", perks: ["Tudo do Ouro", "Nome eternizado no muro", "Jantar com a diretoria", "Camisa autografada"] },
];

function Carteirinha() {
  const { user } = useAuth();
  const { all, loading } = useMySubscriptions();
  const subs = all;
  const [portalLoading, setPortalLoading] = useState(false);
  const [teams, setTeams] = useState<Record<string, Team>>({});

  const teamIdsKey = Array.from(
    new Set(subs.map((s) => s.team_id).filter((x): x is string => !!x)),
  )
    .sort()
    .join(",");
  useEffect(() => {
    if (!teamIdsKey) { setTeams({}); return; }
    fetchTeamsByIds(teamIdsKey.split(",")).then(setTeams);
  }, [teamIdsKey]);

  const meta = (user?.user_metadata ?? {}) as { full_name?: string; nickname?: string };
  const displayName = meta.full_name || user?.email || "Apoiador";
  const nickname = meta.nickname;

  const currentMaxAmount = subs
    .filter(isActive)
    .reduce((max, s) => {
      const t = TIERS.find((x) => x.priceId === s.price_id);
      return t && t.amount > max ? t.amount : max;
    }, 0);
  const currentTierIndex = TIERS.reduce(
    (idx, t, i) => (t.amount <= currentMaxAmount ? i : idx),
    -1,
  );

  async function openPortal() {
    setPortalLoading(true);
    try {
      const url = await createPortalSession({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      if (url) window.open(url, "_blank");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <MobileShell>
      <TopBar title="MINHAS CARTEIRINHAS" />
      <div className="px-4 pt-4 space-y-5">
        {loading && <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>}

        {!loading && subs.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">Você ainda não apoia nenhum time.</p>
            <Link to="/times" className="inline-block bg-gradient-gold text-gold-foreground font-display py-3 px-6 rounded-xl">
              ESCOLHER UM TIME
            </Link>
          </div>
        )}

        {!loading && subs.length > 0 && (
          <>
            {subs.map((sub) => {
              const team = sub.team_id ? teams[sub.team_id] : null;
              if (!team) return null;
              const isActiveSub = isActive(sub);
              const tier = TIER_BY_PRICE[sub.price_id] ?? { name: sub.price_id, color: "bg-muted text-muted-foreground border-border" };
              const number = sub.id.slice(0, 8).toUpperCase();
              const since = sub.created_at
                ? new Date(sub.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
                : "—";
              const renew = sub.current_period_end
                ? new Date(sub.current_period_end).toLocaleDateString("pt-BR")
                : "—";
              const isPix = sub.stripe_subscription_id?.startsWith("pix|");
              const endMs = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
              const daysLeft = endMs ? Math.ceil((endMs - Date.now()) / 86400000) : null;
              return (
                <div
                  key={sub.id}
                  className={`relative rounded-3xl overflow-hidden p-5 border ${
                    isActiveSub
                      ? "bg-gradient-night border-gold/30 shadow-glow-gold"
                      : "bg-muted/40 border-border grayscale opacity-80"
                  }`}
                >
                  {isActiveSub && (
                    <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
                  )}
                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14"><TeamCrest url={team.crest_url} name={team.name} /></div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sócio Torcedor</p>
                          <h3 className="font-display text-xl leading-tight">{team.name}</h3>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                          isActiveSub
                            ? tier.color
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {isActiveSub ? tier.name : "Vencida"}
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider">Nº</p>
                        <p className="font-display text-base text-gradient-gold">{number}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider">Desde</p>
                        <p className="font-display text-base">{since}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground uppercase tracking-wider">{isPix ? "Vence" : "Renova"}</p>
                        <p className="font-display text-base">{renew}</p>
                      </div>
                    </div>
                    {isActiveSub && daysLeft !== null && (
                      <p className={`mt-3 text-xs uppercase tracking-wider ${
                        daysLeft <= 5 ? "text-destructive" : daysLeft <= 10 ? "text-gold" : "text-muted-foreground"
                      }`}>
                        {daysLeft <= 0
                          ? "Vence hoje"
                          : daysLeft === 1
                          ? "Vence em 1 dia"
                          : `Vence em ${daysLeft} dias`}
                        {isPix ? " · pague o PIX para renovar" : ""}
                      </p>
                    )}
                    <p className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">
                      {displayName}{nickname ? ` · "${nickname}"` : ""}
                    </p>
                    {isActiveSub && sub.cancel_at_period_end && (
                      <p className="mt-2 text-xs text-destructive">Cancelamento agendado para {renew}.</p>
                    )}
                    {!isActiveSub && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Carteirinha vencida em {renew} — renove para voltar a apoiar o time.
                      </p>
                    )}
                    {isActiveSub ? (
                      <Link to="/qrcode" search={{ team: team.id }} className="mt-3 flex items-center justify-center gap-2 bg-gradient-pitch text-primary-foreground py-3 rounded-xl font-display text-base">
                        <QrCode className="h-4 w-4" /> CHECK-IN NO JOGO
                      </Link>
                    ) : (
                      <Link
                        to="/apoio/$teamId"
                        params={{ teamId: team.id }}
                        className="mt-3 flex items-center justify-center gap-2 bg-gradient-gold text-gold-foreground py-3 rounded-xl font-display text-base"
                      >
                        RENOVAR APOIO
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

            {subs.some((s) => !s.stripe_subscription_id?.startsWith("pix|") && !!s.stripe_customer_id) && (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="w-full flex items-center justify-center gap-2 border border-border bg-card py-3 rounded-xl text-sm disabled:opacity-60"
              >
                <Settings className="h-4 w-4" /> {portalLoading ? "Abrindo portal..." : "Gerenciar assinaturas"}
              </button>
            )}
            <Link to="/times" className="block text-center text-sm text-primary py-2">+ Apoiar outro time</Link>
          </>
        )}

        <section className="pt-2">
          <h2 className="font-display text-lg mb-1">NÍVEIS DE APOIO</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Conforme você renova e sobe de nível, novos benefícios são liberados.
          </p>
          <div className="space-y-2">
            {TIERS.map((t, i) => {
              const isCurrent = i === currentTierIndex;
              const unlocked = i <= currentTierIndex;
              const isNext = i === currentTierIndex + 1;
              return (
                <div
                  key={t.priceId}
                  className={`rounded-2xl border p-3 ${
                    isCurrent
                      ? "border-gold/50 bg-gold/5"
                      : isNext
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${t.badge}`}>
                        {t.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase tracking-wider text-gold">Atual</span>
                      )}
                      {isNext && (
                        <span className="text-[10px] uppercase tracking-wider text-primary">Próximo nível</span>
                      )}
                    </div>
                    <span className="font-display text-sm">
                      R$ {t.amount.toFixed(2).replace(".", ",")}<span className="text-muted-foreground text-[10px]">/mês</span>
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {t.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs">
                        {unlocked ? (
                          <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        )}
                        <span className={unlocked ? "" : "text-muted-foreground"}>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tutorial: como farmar pontos */}
        <section className="pt-2">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-5 w-5 text-gold" />
            <h2 className="font-display text-lg">COMO FARMAR PONTOS</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Quanto mais ativo na várzea, mais rápido você sobe de nível. Veja o que rende — e o que derruba seus pontos.
          </p>

          {/* Bônus em destaque */}
          <div className="rounded-2xl bg-gradient-pitch p-4 mb-3 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gold/30 blur-2xl" />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-widest text-primary-foreground/70">Combo da rodada</p>
              <p className="font-display text-xl text-primary-foreground leading-tight mt-1">APOIE + APAREÇA + CHAME A QUEBRADA</p>
              <p className="text-xs text-primary-foreground/80 mt-1">Ative os 3 no mês e ganhe <span className="font-bold text-gold">+500 pts bônus</span>.</p>
            </div>
          </div>

          {/* Ações que dão pontos */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Rende pontos
            </p>
            <PointRow icon={<Heart className="h-4 w-4" />} title="Apoiar 1 time (mensal)" pts="+320 pts/mês" />
            <PointRow icon={<Users className="h-4 w-4" />} title="Apoiar 2+ times no mesmo mês" pts="+150 pts extra por time adicional" highlight />
            <PointRow icon={<Calendar className="h-4 w-4" />} title="Manter apoio sem cancelar" pts="+50 pts a cada mês de fidelidade" />
            <PointRow icon={<QrCode className="h-4 w-4" />} title="Check-in no jogo (localização no estádio)" pts="+100 pts por jogo" highlight />
            <PointRow icon={<Trophy className="h-4 w-4" />} title="Check-in em jogo decisivo (final, clássico)" pts="+250 pts" />
            <PointRow icon={<Zap className="h-4 w-4" />} title="Subir de tier (Bronze → Prata, etc.)" pts="+200 pts ao desbloquear" />
            <PointRow icon={<Megaphone className="h-4 w-4" />} title="Indicar amigo que vira apoiador" pts="+400 pts por indicação" highlight />
            <PointRow icon={<Flame className="h-4 w-4" />} title="Sequência de 3 meses sem falhar" pts="x1.5 em todos os pontos do mês" />
          </div>

          {/* Ações que tiram pontos */}
          <div className="space-y-2 mt-4">
            <p className="text-[10px] uppercase tracking-widest text-destructive font-bold flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Derruba pontos
            </p>
            <PointRow icon={<Calendar className="h-4 w-4" />} title="Cancelar a assinatura" pts="-200 pts e perde a sequência" negative />
            <PointRow icon={<Heart className="h-4 w-4" />} title="Deixar a carteirinha vencer" pts="-100 pts por mês parado" negative />
            <PointRow icon={<QrCode className="h-4 w-4" />} title="Não fazer check-in em nenhum jogo do mês" pts="-50 pts no fim do mês" negative />
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-gold/40 bg-gold/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-gold font-bold">Dica de lenda</p>
            <p className="text-xs text-foreground/90 mt-1">
              Apoiadores que mantêm 2+ times com check-in em todo jogo viram <span className="font-bold">Lenda da Várzea</span> em menos de 6 meses. Aparece no topo do ranking, ganha brinde do clube e nome no muro.
            </p>
          </div>
        </section>
      </div>
    </MobileShell>
  );
}

function PointRow({
  icon,
  title,
  pts,
  highlight,
  negative,
}: {
  icon: React.ReactNode;
  title: string;
  pts: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        negative
          ? "border-destructive/30 bg-destructive/5"
          : highlight
          ? "border-gold/40 bg-gold/5"
          : "border-border bg-card"
      }`}
    >
      <div
        className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          negative
            ? "bg-destructive/15 text-destructive"
            : highlight
            ? "bg-gradient-gold text-gold-foreground"
            : "bg-gradient-pitch text-primary-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-tight">{title}</p>
        <p
          className={`text-[11px] mt-0.5 font-bold ${
            negative ? "text-destructive" : highlight ? "text-gradient-gold" : "text-primary"
          }`}
        >
          {pts}
        </p>
      </div>
    </div>
  );
}
