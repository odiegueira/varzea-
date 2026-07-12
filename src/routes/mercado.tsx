import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { POSITIONS, POSITION_LABEL, type Player, type Position } from "@/lib/players";
import { MapPin, Plus, UserCircle2 } from "lucide-react";

export const Route = createFileRoute("/mercado")({
  component: () => (<RequireAuth><Mercado /></RequireAuth>),
});

function Mercado() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [filter, setFilter] = useState<Position | "todos">("todos");
  const [hasMine, setHasMine] = useState<boolean>(false);

  useEffect(() => {
    let q = supabase.from("players").select("*").eq("is_published", true).order("created_at", { ascending: false });
    if (filter !== "todos") q = q.eq("position", filter);
    q.then(({ data }) => setPlayers((data ?? []) as Player[]));
  }, [filter]);

  useEffect(() => {
    if (!user) return;
    supabase.from("players").select("user_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setHasMine(Boolean(data)));
  }, [user]);

  const chips = useMemo(() => ["todos" as const, ...POSITIONS], []);

  if (path !== "/mercado") return <Outlet />;

  return (
    <MobileShell>
      <TopBar title="MERCADO" />
      <div className="px-4 pt-4 space-y-4">
        <Link
          to="/mercado/editar"
          className="flex items-center gap-3 rounded-2xl p-4 bg-gradient-pitch shadow-glow-green"
        >
          <div className="h-10 w-10 rounded-full bg-primary-foreground/15 flex items-center justify-center">
            {hasMine ? <UserCircle2 className="h-5 w-5 text-primary-foreground" /> : <Plus className="h-5 w-5 text-primary-foreground" />}
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-primary-foreground leading-tight">
              {hasMine ? "EDITAR MEU PERFIL" : "ENTRAR NO MERCADO"}
            </p>
            <p className="text-xs text-primary-foreground/80">
              {hasMine ? "Atualize seus dados e fotos" : "Crie seu perfil de jogador da várzea"}
            </p>
          </div>
        </Link>

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {chips.map((c) => {
            const active = filter === c;
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {c === "todos" ? "Todos" : POSITION_LABEL[c]}
              </button>
            );
          })}
        </div>

        {players === null ? (
          <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
        ) : players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhum jogador por aqui ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a entrar no mercado.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {players.map((p) => (
              <li key={p.user_id}>
                <Link
                  to="/mercado/$userId"
                  params={{ userId: p.user_id }}
                  className="block bg-card border border-border rounded-2xl overflow-hidden hover:border-primary transition"
                >
                  <div className="aspect-[4/5] bg-muted relative">
                    <img src={p.avatar_url} alt={p.display_name} loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider bg-black/60 text-white px-2 py-0.5 rounded-full">
                      {POSITION_LABEL[p.position]}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="font-display text-base leading-tight truncate">{p.display_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.age} anos</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {p.city}/{p.state}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}