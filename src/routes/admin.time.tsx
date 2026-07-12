import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type TeamRow = {
  id: string; name: string; nickname: string | null; neighborhood: string | null; city: string | null;
  founded: number | null; monthly_price: number | null; crest_url: string | null;
  colors: string | null; story: string | null;
};

export const Route = createFileRoute("/admin/time")({
  component: () => (<RequireAuth><Gate /></RequireAuth>),
});

function Gate() {
  const { isDirector, loading } = useUserRole();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Carregando...</p></div>;
  if (!isDirector) return <Navigate to="/home" />;
  return <Page />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Page() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: links } = await supabase
        .from("team_directors")
        .select("team_id")
        .eq("user_id", user.id)
        .limit(1);
      const teamId = links?.[0]?.team_id;
      if (!teamId) { if (!cancelled) { setTeam(null); setLoading(false); } return; }
      const { data, error } = await supabase
        .from("teams")
        .select("id,name,nickname,neighborhood,city,founded,monthly_price,crest_url,colors,story")
        .eq("id", teamId)
        .maybeSingle();
      if (!cancelled) {
        if (error) toast.error(error.message);
        setTeam(data as TeamRow | null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  async function save() {
    if (!team) return;
    setSaving(true);
    const { error } = await supabase
      .from("teams")
      .update({
        name: team.name,
        nickname: team.nickname || null,
        neighborhood: team.neighborhood || null,
        city: team.city || null,
        founded: team.founded ? Number(team.founded) : null,
        monthly_price: team.monthly_price !== null && team.monthly_price !== undefined ? Number(team.monthly_price) : null,
        crest_url: team.crest_url || null,
        colors: team.colors || null,
        story: team.story || null,
      })
      .eq("id", team.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Time atualizado!");
    navigate({ to: "/admin" });
  }

  return (
    <MobileShell>
      <TopBar title="EDITAR TIME" back="/admin" />
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : !team ? (
          <p className="text-sm text-muted-foreground text-center py-8">Você não está vinculado a nenhum time.</p>
        ) : (
          <>
            <Field label="Nome"><Input value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} /></Field>
            <Field label="Apelido"><Input value={team.nickname ?? ""} onChange={(e) => setTeam({ ...team, nickname: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Bairro"><Input value={team.neighborhood ?? ""} onChange={(e) => setTeam({ ...team, neighborhood: e.target.value })} /></Field>
              <Field label="Cidade"><Input value={team.city ?? ""} onChange={(e) => setTeam({ ...team, city: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Fundação"><Input type="number" value={team.founded ?? ""} onChange={(e) => setTeam({ ...team, founded: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Mensalidade (R$)"><Input type="number" step="0.01" value={team.monthly_price ?? ""} onChange={(e) => setTeam({ ...team, monthly_price: e.target.value ? Number(e.target.value) : null })} /></Field>
            </div>
            <Field label="URL do escudo"><Input value={team.crest_url ?? ""} onChange={(e) => setTeam({ ...team, crest_url: e.target.value })} placeholder="https://..." /></Field>
            <Field label="Cores"><Input value={team.colors ?? ""} onChange={(e) => setTeam({ ...team, colors: e.target.value })} placeholder="Verde e branco" /></Field>
            <Field label="História"><Textarea rows={5} value={team.story ?? ""} onChange={(e) => setTeam({ ...team, story: e.target.value })} /></Field>
            <Button className="w-full" disabled={saving} onClick={save}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
          </>
        )}
      </div>
    </MobileShell>
  );
}