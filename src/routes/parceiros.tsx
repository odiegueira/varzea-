import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { TeamCrest } from "@/components/varzea/TeamCrest";
import { supabase } from "@/integrations/supabase/client";
import { fetchTeamsByIds, type Team } from "@/hooks/useTeams";
import { MapPin, Phone, Tag, Lock } from "lucide-react";
import { useMySubscriptions } from "@/hooks/useMySubscriptions";

export const Route = createFileRoute("/parceiros")({
  component: () => (<RequireAuth><Parceiros /></RequireAuth>),
});

type Partner = {
  id: string;
  name: string;
  category: string;
  discount: string;
  icon: string;
  team_id: string | null;
  address: string | null;
  description: string | null;
  products: string | null;
  whatsapp: string | null;
};

function Parceiros() {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const { active } = useMySubscriptions();
  const supportedTeams = new Set(active.map((s) => s.team_id).filter((x): x is string => !!x));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("partners")
        .select("id,name,category,discount,icon,team_id,address,description,products,whatsapp")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = (data ?? []) as Partner[];
      setPartners(list);
      const ids = Array.from(new Set(list.map((p) => p.team_id).filter((x): x is string => !!x)));
      if (ids.length) fetchTeamsByIds(ids).then((m) => !cancelled && setTeams(m));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <MobileShell>
      <TopBar title="PARCEIROS DA QUEBRADA" />
      <div className="px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-gradient-gold p-5 text-gold-foreground">
          <p className="text-xs uppercase tracking-widest font-bold">Vantagem de assinante</p>
          <p className="font-display text-2xl mt-1">DESCONTOS NO BAIRRO</p>
          <p className="text-sm">Use sua carteirinha digital nos comércios parceiros. Apoiar o time e economizar.</p>
        </div>

        {partners === null && (
          <p className="text-center text-sm text-muted-foreground py-8">Carregando parceiros...</p>
        )}
        {partners !== null && partners.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Em breve sua carteirinha vai render desconto na quebrada.</p>
          </div>
        )}
        {partners !== null && partners.length > 0 && (
          <div className="space-y-3">
            {partners.map((p) => {
              const team = p.team_id ? teams[p.team_id] : null;
              const wppDigits = p.whatsapp?.replace(/\D/g, "");
              return (
                <div key={p.id} className="bg-card border border-border rounded-2xl p-4 hover:border-primary transition">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl leading-none">{p.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-lg leading-tight">{p.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.category}</p>
                    </div>
                    {p.team_id && supportedTeams.has(p.team_id) ? (
                      <span className="text-sm font-bold text-gradient-gold whitespace-nowrap">{p.discount}</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Apoiadores
                      </span>
                    )}
                  </div>

                  {p.description && (
                    <p className="mt-3 text-sm text-foreground/90">{p.description}</p>
                  )}

                  {p.products && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                      <Tag className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      <span>{p.products}</span>
                    </div>
                  )}

                  {p.address && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-primary underline-offset-2 hover:underline"
                      >
                        {p.address}
                      </a>
                    </div>
                  )}

                  {wppDigits && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <a
                        href={`https://wa.me/${wppDigits.startsWith("55") ? wppDigits : "55" + wppDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {p.whatsapp}
                      </a>
                    </div>
                  )}

                  {team && (
                    <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2">
                      <div className="h-7 w-7 flex-shrink-0">
                        <TeamCrest url={team.crest_url} name={team.name} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">Parceiro do time</p>
                        <p className="text-xs font-semibold truncate">{team.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
