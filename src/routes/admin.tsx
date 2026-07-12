import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { TeamCrest } from "@/components/varzea/TeamCrest";
import { fetchTeamsByIds, type Team } from "@/hooks/useTeams";
import { Settings, Tag, Wallet, Shield } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  component: () => (<RequireAuth><AdminGate /></RequireAuth>),
});

function AdminGate() {
  const { isDirector, loading } = useUserRole();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (!loading && !isDirector) {
      toast.error("Acesso restrito a diretores de time.");
    }
  }, [loading, isDirector]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }
  if (!isDirector) return <Navigate to="/home" />;
  if (path !== "/admin") return <Outlet />;
  return <Admin />;
}

function Admin() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [team, setTeam] = useState<Team | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: links } = await supabase
        .from("team_directors")
        .select("team_id")
        .eq("user_id", user.id);
      const ids = (links ?? []).map((l: { team_id: string }) => l.team_id);
      if (ids.length === 0) { if (!cancelled) setTeam(null); return; }
      const map = await fetchTeamsByIds(ids);
      if (!cancelled) setTeam(Object.values(map)[0] ?? null);
    })();
    return () => { cancelled = true; };
  }, [user]);
  return (
    <MobileShell>
      <TopBar title="PAINEL DA DIRETORIA" back="/parceiros" />
      <div className="px-4 pt-4 space-y-5">
        {team ? (
          <Link to="/admin/time" className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border hover:border-primary transition">
            <div className="h-12 w-12"><TeamCrest url={team.crest_url} name={team.name} /></div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Gerenciando</p>
              <p className="font-display text-lg leading-tight">{team.name}</p>
            </div>
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Link>
        ) : (
          <div className="bg-card rounded-2xl p-4 border border-dashed border-border text-center">
            <p className="text-sm text-muted-foreground">Você ainda não está vinculado a um time.</p>
            <p className="text-xs text-muted-foreground mt-1">A administração precisa cadastrar você como diretor.</p>
          </div>
        )}

        <section>
          <h2 className="font-display text-lg mb-3">AÇÕES RÁPIDAS</h2>
          <div className="space-y-2">
            <Link to="/admin/parceiros" className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary transition text-left">
              <div className="h-10 w-10 rounded-xl bg-gradient-gold flex items-center justify-center">
                <Tag className="h-5 w-5 text-gold-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Adicionar parceiros</p>
                <p className="text-xs text-muted-foreground">Cadastrar comércios da quebrada</p>
              </div>
              <span className="text-muted-foreground">›</span>
            </Link>
            <Link to="/admin/financeiro" className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary transition text-left">
              <div className="h-10 w-10 rounded-xl bg-gradient-pitch flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Financeiro / Mercado Pago</p>
                <p className="text-xs text-muted-foreground">Conectar conta, ver receita e sacar</p>
              </div>
              <span className="text-muted-foreground">›</span>
            </Link>
            {isAdmin && (
              <Link to="/admin/times" className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary transition text-left">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Gerenciar times <span className="text-[10px] uppercase tracking-wider text-primary ml-1">admin</span></p>
                  <p className="text-xs text-muted-foreground">Criar, editar e vincular diretores</p>
                </div>
                <span className="text-muted-foreground">›</span>
              </Link>
            )}
          </div>
        </section>

        <Link to="/home" className="block text-center text-xs text-muted-foreground py-4 underline">
          Voltar para visão de torcedor
        </Link>
      </div>
    </MobileShell>
  );
}

