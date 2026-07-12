import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { useTeams } from "@/hooks/useTeams";
import { TeamCrest } from "@/components/varzea/TeamCrest";
import { Search, MapPin, Heart } from "lucide-react";

export const Route = createFileRoute("/times")({ component: Times });

function Times() {
  const { teams, loading } = useTeams();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const list = teams ?? [];
    if (!q.trim()) return list;
    const term = q.trim().toLowerCase();
    return list.filter((t) =>
      [t.name, t.nickname, t.neighborhood, t.city].some((v) => (v ?? "").toLowerCase().includes(term))
    );
  }, [teams, q]);

  return (
    <MobileShell>
      <TopBar title="TIMES DA CIDADE" />
      <div className="px-4 pt-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Buscar time, bairro..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {loading && (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando times...</p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 space-y-3 border border-dashed border-border rounded-2xl px-4">
            <p className="font-display text-xl">NENHUM TIME AINDA</p>
            <p className="text-sm text-muted-foreground">
              Os times da quebrada aparecem aqui assim que a diretoria cadastrar.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id}
                 className="bg-card rounded-2xl p-4 border border-border shadow-card hover:border-primary transition">
              <Link to="/times/$teamId" params={{ teamId: t.id }} className="flex items-center gap-4">
                <div className="h-16 w-16 flex-shrink-0 bg-gradient-night rounded-xl p-1.5">
                  <TeamCrest url={t.crest_url} name={t.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg leading-tight truncate">{t.name}</h3>
                  {t.nickname && <p className="text-xs text-muted-foreground italic">"{t.nickname}"</p>}
                  <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    {t.neighborhood && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.neighborhood}</span>
                    )}
                    {t.monthly_price != null && (
                      <span className="flex items-center gap-1 text-gold">
                        a partir de R$ {Number(t.monthly_price).toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <Link to="/apoio/$teamId" params={{ teamId: t.id }}
                    className="mt-3 flex items-center justify-center gap-2 bg-gradient-pitch rounded-xl py-2.5 text-primary-foreground font-display tracking-wider text-sm shadow-glow-green">
                <Heart className="h-4 w-4" /> APOIAR AGORA
              </Link>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
