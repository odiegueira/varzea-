import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { Trophy, Heart, Crown, Medal, Flame, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/ranking")({ component: Ranking });

type Row = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  monthly_cents: number;
  team_count: number;
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function Ranking() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_global_top_supporters", {
        check_env: getStripeEnvironment(),
        lim: 100,
      });
      if (cancelled) return;
      if (error) {
        console.error(error);
        setRows([]);
        return;
      }
      setRows((data ?? []) as Row[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const top3 = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  const me = rows?.find((r) => r.user_id === user?.id);
  const totalApoiadores = rows?.length ?? 0;
  const totalTimes = (rows ?? []).reduce((acc, r) => acc + (r.team_count ?? 0), 0);

  return (
    <MobileShell>
      <TopBar title="HALL DA VÁRZEA" />
      <div className="px-4 pt-4 pb-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-pitch p-5 shadow-glow-green">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/40 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-primary/40 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-primary-foreground/80 text-xs uppercase tracking-widest">
              <Flame className="h-3.5 w-3.5 text-gold" />
              Maiores apoiadores
            </div>
            <h1 className="font-display text-3xl text-primary-foreground mt-1 leading-tight">
              QUEM SUSTENTA<br />A VÁRZEA
            </h1>
            <div className="mt-4 flex gap-3">
              <div className="flex-1 rounded-xl bg-black/30 backdrop-blur-sm px-3 py-2 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-primary-foreground/70">Apoiadores</p>
                <p className="font-display text-xl text-primary-foreground">{totalApoiadores}</p>
              </div>
              <div className="flex-1 rounded-xl bg-black/30 backdrop-blur-sm px-3 py-2 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-primary-foreground/70">Times apoiados</p>
                <p className="font-display text-xl text-gold">{totalTimes}</p>
              </div>
            </div>
          </div>
        </div>

        {rows === null && (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando ranking...</p>
        )}

        {rows !== null && rows.length === 0 && (
          <div className="mt-8 text-center py-12 px-4 border border-dashed border-border rounded-2xl space-y-3">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="font-display text-xl">PRIMEIRO LUGAR ESTÁ VAGO</p>
            <p className="text-sm text-muted-foreground">
              Apoie um time e seu nome aparece eternizado aqui no topo.
            </p>
          </div>
        )}

        {rows !== null && rows.length > 0 && (
          <>
            {/* Podium */}
            {top3.length >= 1 && (
              <div className="mt-6">
                <div className="grid grid-cols-3 gap-3 items-end">
                  <PodiumColumn place={2} row={top3[1]} />
                  <PodiumColumn place={1} row={top3[0]} />
                  <PodiumColumn place={3} row={top3[2]} />
                </div>
              </div>
            )}

            {/* Your position card */}
            {me && me.rank > 3 && (
              <div className="mt-6 rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/10 to-gold/5 p-4 shadow-glow-gold">
                <div className="flex items-center gap-3">
                  <div className="font-display text-3xl text-gold w-12 text-center">{me.rank}º</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-gold">Sua posição</p>
                    <p className="text-sm font-semibold truncate">{me.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {me.team_count} {me.team_count === 1 ? "time" : "times"} · {formatBRL(me.monthly_cents)}/mês
                    </p>
                  </div>
                  <Sparkles className="h-5 w-5 text-gold" />
                </div>
              </div>
            )}

            {/* Rest of leaderboard */}
            {rest.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-lg">A ESCALAÇÃO</h2>
                </div>
                <div className="space-y-2">
                  {rest.map((r) => {
                    const isMe = r.user_id === user?.id;
                    return (
                      <div
                        key={r.user_id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md border-b border-border/40 last:border-b-0 ${
                          isMe ? "bg-gold/5" : ""
                        }`}
                      >
                        <div className="font-display text-base text-muted-foreground w-7 text-center">{r.rank}</div>
                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-pitch overflow-hidden flex items-center justify-center text-primary-foreground text-[10px] font-display">
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt={r.display_name} className="h-full w-full object-cover" />
                          ) : (
                            initials(r.display_name)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate flex items-center gap-1.5">
                            <span className="truncate">{r.display_name}</span>
                            {isMe && <span className="text-[9px] uppercase tracking-widest text-gold">você</span>}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Heart className="h-3 w-3 text-primary" />
                          {r.team_count}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-8 p-5 bg-gradient-gold rounded-2xl shadow-glow-gold text-gold-foreground relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-20">
            <Crown className="h-32 w-32" />
          </div>
          <p className="text-xs uppercase tracking-widest font-bold opacity-80">Como subir no ranking</p>
          <p className="font-display text-2xl mt-1">APOIE MAIS, SUBA MAIS</p>
          <p className="text-sm mt-1 opacity-90 max-w-[80%]">
            Cada plano ativo soma valor mensal. Apoie mais times ou em planos mais altos e vire lenda da quebrada.
          </p>
        </div>
      </div>
    </MobileShell>
  );
}

function PodiumColumn({ place, row }: { place: 1 | 2 | 3; row?: Row }) {
  const empty = !row;
  const heights = { 1: "h-44", 2: "h-32", 3: "h-28" } as const;
  const tones = {
    1: { bg: "from-gold/30 to-gold/5", border: "border-gold/60", text: "text-gold", glow: "shadow-glow-gold", icon: Crown },
    2: { bg: "from-silver/30 to-silver/5", border: "border-silver/50", text: "text-silver", glow: "", icon: Medal },
    3: { bg: "from-bronze/30 to-bronze/5", border: "border-bronze/50", text: "text-bronze", glow: "", icon: Medal },
  } as const;
  const tone = tones[place];
  const Icon = tone.icon;
  return (
    <div className="flex flex-col items-center">
      {/* Avatar circle */}
      <div className="relative mb-2">
        <div
          className={`h-16 w-16 rounded-full bg-gradient-pitch overflow-hidden flex items-center justify-center text-primary-foreground font-display text-lg border-2 ${tone.border} ${
            place === 1 ? "shadow-glow-gold scale-110" : ""
          }`}
        >
          {empty ? "—" : row.avatar_url ? (
            <img src={row.avatar_url} alt={row.display_name} className="h-full w-full object-cover" />
          ) : (
            initials(row.display_name)
          )}
        </div>
        <div className={`absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background flex items-center justify-center border ${tone.border}`}>
          <Icon className={`h-4 w-4 ${tone.text}`} />
        </div>
      </div>
      <p className={`text-[11px] font-bold leading-tight text-center line-clamp-2 px-1 ${empty ? "text-muted-foreground" : ""}`}>
        {empty ? "Vago" : row.display_name}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {empty ? "—" : `${formatBRL(row.monthly_cents)}/mês`}
      </p>
      {/* Pillar */}
      <div
        className={`mt-2 w-full ${heights[place]} rounded-t-2xl border-t-2 border-x ${tone.border} bg-gradient-to-b ${tone.bg} ${tone.glow} flex flex-col items-center justify-start pt-3 px-2`}
      >
        <p className={`font-display text-3xl ${tone.text}`}>{place}º</p>
        {!empty && (
          <div className="mt-2 flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-1 text-[10px] text-foreground/80">
              <Heart className="h-3 w-3 text-primary" />
              <span>{row.team_count} {row.team_count === 1 ? "time" : "times"}</span>
            </div>
            {place === 1 && (
              <p className="text-[9px] uppercase tracking-widest text-gold leading-tight">Lenda da quebrada</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
