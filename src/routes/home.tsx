import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { getTierProgress, TIER_LADDER, POINTS_PER_SUBSCRIPTION } from "@/lib/varzea-data";
import { fetchTeamsByIds, type Team } from "@/hooks/useTeams";
import { TeamCrest } from "@/components/varzea/TeamCrest";
import { Heart, Sparkles, Trophy, Users, Lock, Check, Gift } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useMySubscriptions } from "@/hooks/useMySubscriptions";

export const Route = createFileRoute("/home")({
  component: () => (
    <RequireAuth>
      <Home />
    </RequireAuth>
  ),
});

function Home() {
  const { active } = useMySubscriptions();
  const [teams, setTeams] = useState<Record<string, Team>>({});
  useEffect(() => {
    const ids = Array.from(new Set(active.map((s) => s.team_id).filter((x): x is string => !!x)));
    if (ids.length === 0) { setTeams({}); return; }
    fetchTeamsByIds(ids).then(setTeams);
  }, [active]);
  const myTeams = active.map((s) => (s.team_id ? teams[s.team_id] : null)).filter((t): t is Team => !!t);
  const userPoints = active.length * POINTS_PER_SUBSCRIPTION;
  const { current, next, progress, missing, subsToNext } = getTierProgress(userPoints);
  return (
    <MobileShell>
      <TopBar />
      <div className="px-4 pt-4 space-y-6">
        {/* Tier card */}
        <div className="rounded-2xl p-5 bg-gradient-pitch shadow-glow-green relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gold/30 blur-3xl" />
          <div className="relative">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-primary-foreground/70">Seu nível</p>
                <p className="font-display text-3xl text-primary-foreground mt-1 leading-none">{current.tier.toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-primary-foreground/70">Pontos</p>
                <p className="font-display text-2xl text-gold leading-none">{userPoints}</p>
              </div>
            </div>

            {/* Progress bar with markers */}
            <div className="mt-4">
              <div className="relative h-2.5 bg-primary-foreground/15 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-gold transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-primary-foreground/60">
                <span>{current.tier}</span>
                {next && <span className="text-gold/90">{next.tier}</span>}
              </div>
            </div>

            {/* Next-level call to action */}
            {next ? (
              <div className="mt-4 rounded-xl bg-background/15 backdrop-blur-sm border border-primary-foreground/10 p-3">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-primary-foreground/70">Próxima recompensa</p>
                    <p className="text-sm text-primary-foreground font-semibold leading-snug">{next.perk}</p>
                    <p className="text-[11px] text-primary-foreground/80 mt-1">
                      Faltam <span className="font-bold text-gold">{missing} pts</span>
                      {subsToNext > 0 && (
                        <> — apoie mais {subsToNext} {subsToNext === 1 ? "time" : "times"} pra desbloquear</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-background/15 border border-primary-foreground/10 p-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gold" />
                <p className="text-sm text-primary-foreground font-semibold">Você é uma lenda da várzea!</p>
              </div>
            )}
          </div>
        </div>

        {/* Tier ladder */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-4 w-4 text-gold" />
            <h2 className="font-display text-sm uppercase tracking-wider">Recompensas por nível</h2>
          </div>
          <ul className="space-y-2">
            {TIER_LADDER.map((step) => {
              const unlocked = userPoints >= step.min;
              const isCurrent = step.tier === current.tier;
              return (
                <li
                  key={step.tier}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : unlocked
                      ? "border-border bg-card"
                      : "border-border/50 bg-card/50"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      unlocked ? "bg-gradient-gold text-gold-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {unlocked ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-sm leading-tight">
                        {step.tier.toUpperCase()}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {step.min} pts
                      </p>
                    </div>
                    <p className={`text-xs leading-snug mt-0.5 ${unlocked ? "text-foreground/80" : "text-muted-foreground"}`}>
                      {step.perk}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Cada time apoiado vale {POINTS_PER_SUBSCRIPTION} pts por mês.
          </p>
        </section>

        {/* My teams */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl">MEUS TIMES</h2>
            <Link to="/times" className="text-xs text-primary uppercase tracking-wider">Ver todos</Link>
          </div>
          {myTeams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-5 text-center">
              <p className="text-sm text-muted-foreground">Você ainda não apoia nenhum time.</p>
              <Link to="/times" className="inline-block mt-3 text-sm text-primary font-semibold uppercase tracking-wider">
                Encontrar um time →
              </Link>
            </div>
          ) : (
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2">
            {myTeams.map((t) => (
              <Link key={t.id} to="/times/$teamId" params={{ teamId: t.id }}
                    className="flex-shrink-0 w-32 bg-card rounded-2xl p-3 border border-border shadow-card hover:border-primary transition">
                <div className="aspect-square bg-gradient-night rounded-xl flex items-center justify-center p-2">
                  <TeamCrest url={t.crest_url} name={t.name} />
                </div>
                <p className="mt-2 text-xs font-semibold leading-tight">{t.name}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Heart className="h-3 w-3 fill-primary text-primary" /> Apoiando
                </p>
              </Link>
            ))}
          </div>
          )}
        </section>

        {/* Atalhos */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-gold" />
            <h2 className="font-display text-xl">EXPLORAR</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/times" className="bg-card border border-border rounded-2xl p-4 hover:border-primary transition">
              <div className="h-10 w-10 rounded-xl bg-gradient-pitch flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <p className="font-display text-base mt-3 leading-tight">TIMES DA CIDADE</p>
              <p className="text-xs text-muted-foreground mt-1">Descubra e apoie um time da quebrada.</p>
            </Link>
            <Link to="/ranking" className="bg-card border border-border rounded-2xl p-4 hover:border-gold transition">
              <div className="h-10 w-10 rounded-xl bg-gradient-gold flex items-center justify-center">
                <Trophy className="h-5 w-5 text-gold-foreground" />
              </div>
              <p className="font-display text-base mt-3 leading-tight">RANKING</p>
              <p className="text-xs text-muted-foreground mt-1">Veja os maiores apoiadores da várzea.</p>
            </Link>
          </div>
        </section>
      </div>
    </MobileShell>
  );
}
