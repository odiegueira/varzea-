import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { useTeam } from "@/hooks/useTeams";
import { TeamCrest } from "@/components/varzea/TeamCrest";
import { Calendar, MapPin, Heart, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/times/$teamId")({
  component: TeamProfile,
  notFoundComponent: () => <div className="p-8 text-center">Time não encontrado.</div>,
});

type Supporter = { rank: number; user_id: string; display_name: string; monthly_cents: number };

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function TeamProfile() {
  const { teamId } = Route.useParams();
  const { team: t, loading } = useTeam(teamId);
  const [top, setTop] = useState<Supporter[] | null>(null);
  useEffect(() => {
    if (!t) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_team_top_supporters", {
        team_id_in: t.id,
        check_env: getStripeEnvironment(),
        lim: 5,
      });
      if (cancelled) return;
      if (error) { console.error(error); setTop([]); return; }
      setTop((data ?? []) as Supporter[]);
    })();
    return () => { cancelled = true; };
  }, [t]);

  if (loading) {
    return (
      <MobileShell>
        <TopBar title="CARREGANDO..." back="/times" />
        <p className="p-8 text-center text-sm text-muted-foreground">Carregando time...</p>
      </MobileShell>
    );
  }
  if (!t) {
    return (
      <MobileShell>
        <TopBar title="TIME" back="/times" />
        <p className="p-8 text-center">Time não encontrado.</p>
      </MobileShell>
    );
  }

  const monthly = t.monthly_price != null ? Number(t.monthly_price) : 14.9;
  return (
    <MobileShell>
      <TopBar title={(t.nickname ?? t.name).toUpperCase()} back="/times" />
      <div className="relative h-48 bg-gradient-pitch field-stripes overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
          <div className="h-24 w-24 bg-card rounded-2xl p-2 shadow-glow-gold">
            <TeamCrest url={t.crest_url} name={t.name} />
          </div>
          <div className="flex-1 pb-1">
            <h1 className="font-display text-2xl leading-tight">{t.name}</h1>
            <p className="text-xs text-muted-foreground">
              {t.founded ? `Fundado em ${t.founded}` : "Time da quebrada"}
              {t.colors ? ` · ${t.colors}` : ""}
            </p>
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 space-y-5">
        {(t.neighborhood || t.city || t.founded) && (
          <div className="grid grid-cols-3 gap-2">
            {t.neighborhood && <Stat icon={MapPin} label="Bairro" value={t.neighborhood} />}
            {t.city && <Stat icon={MapPin} label="Cidade" value={t.city} accent />}
            {t.founded && <Stat icon={Calendar} label="Anos" value={String(new Date().getFullYear() - t.founded)} />}
          </div>
        )}

        <Link to="/apoio/$teamId" params={{ teamId: t.id }}
              className="flex items-center justify-between bg-gradient-pitch rounded-2xl p-4 shadow-glow-green">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary-foreground/70">Apoio mensal</p>
            <p className="font-display text-3xl text-primary-foreground">A partir de R$ {monthly.toFixed(2).replace(".", ",")}</p>
          </div>
          <Heart className="h-10 w-10 text-primary-foreground" />
        </Link>

        {t.story && (
          <section>
            <h2 className="font-display text-lg mb-2">A HISTÓRIA</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.story}</p>
          </section>
        )}

        <section>
          <h2 className="font-display text-lg mb-2 flex items-center gap-2">
            <Crown className="h-4 w-4 text-gold" /> TOP APOIADORES
          </h2>
          {top === null && (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
          {top !== null && top.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ninguém apoia ainda. <Link to="/apoio/$teamId" params={{ teamId: t.id }} className="text-primary">Seja o primeiro.</Link>
            </p>
          )}
          {top !== null && top.length > 0 && (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border">
              {top.map((s) => (
                <div key={s.user_id} className="flex items-center gap-3 p-3">
                  <div className="font-display text-lg text-gold w-6 text-center">{s.rank}º</div>
                  <p className="flex-1 text-sm font-semibold truncate">{s.display_name}</p>
                  <p className="text-xs text-muted-foreground">{formatBRL(s.monthly_cents)}/mês</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </MobileShell>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card rounded-xl p-3 border border-border text-center">
      <Icon className={`h-4 w-4 mx-auto ${accent ? "text-gold" : "text-primary"}`} />
      <p className="font-display text-xl mt-1 leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
