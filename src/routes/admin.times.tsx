import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { TeamCrest } from "@/components/varzea/TeamCrest";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListTeams,
  adminCreateTeam,
  adminUpdateTeam,
  adminDeleteTeam,
  adminListDirectors,
  adminLinkDirector,
  adminUnlinkDirector,
} from "@/lib/admin-teams.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserPlus, X } from "lucide-react";

type TeamRow = {
  id: string; name: string; nickname: string | null; neighborhood: string | null; city: string | null;
  founded: number | null; monthly_price: number | null; crest_url: string | null;
  colors: string | null; story: string | null; is_active: boolean;
  stadium_name: string | null; stadium_latitude: number | null; stadium_longitude: number | null; checkin_radius_m: number;
};

export const Route = createFileRoute("/admin/times")({
  component: () => (<RequireAuth><Gate /></RequireAuth>),
});

function Gate() {
  const { isAdmin, loading } = useUserRole();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Carregando...</p></div>;
  if (!isAdmin) return <Navigate to="/admin" />;
  return <Page />;
}

function emptyTeam(): TeamRow {
  return { id: "", name: "", nickname: "", neighborhood: "", city: "", founded: null, monthly_price: 10, crest_url: "", colors: "", story: "", is_active: true, stadium_name: "", stadium_latitude: null, stadium_longitude: null, checkin_radius_m: 250 };
}

function Page() {
  const list = useServerFn(adminListTeams);
  const create = useServerFn(adminCreateTeam);
  const update = useServerFn(adminUpdateTeam);
  const remove = useServerFn(adminDeleteTeam);
  const [teams, setTeams] = useState<TeamRow[] | null>(null);
  const [editing, setEditing] = useState<TeamRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [directorsFor, setDirectorsFor] = useState<string | null>(null);

  async function reload() {
    try { setTeams(await list() as TeamRow[]); } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { reload(); }, []);

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        ...editing,
        nickname: editing.nickname || null,
        neighborhood: editing.neighborhood || null,
        city: editing.city || null,
        crest_url: editing.crest_url || null,
        colors: editing.colors || null,
        story: editing.story || null,
        stadium_name: editing.stadium_name || null,
        stadium_latitude: editing.stadium_latitude === null ? null : Number(editing.stadium_latitude),
        stadium_longitude: editing.stadium_longitude === null ? null : Number(editing.stadium_longitude),
        checkin_radius_m: Number(editing.checkin_radius_m || 250),
        founded: editing.founded ? Number(editing.founded) : null,
        monthly_price: editing.monthly_price !== null && editing.monthly_price !== undefined ? Number(editing.monthly_price) : null,
      };
      if (isNew) await create({ data: payload });
      else await update({ data: payload });
      toast.success(isNew ? "Time criado!" : "Time atualizado!");
      setEditing(null); setIsNew(false);
      await reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Excluir este time? Esta ação não pode ser desfeita.")) return;
    try { await remove({ data: { id } }); toast.success("Time excluído"); await reload(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <MobileShell>
      <TopBar title="GERENCIAR TIMES" back="/admin" />
      <div className="px-4 pt-4 space-y-4">
        <Button className="w-full" onClick={() => { setEditing(emptyTeam()); setIsNew(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo time
        </Button>

        {teams === null ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum time cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {teams.map((t) => (
              <li key={t.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="h-12 w-12 shrink-0"><TeamCrest url={t.crest_url} name={t.name} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm leading-tight truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.neighborhood || t.city || t.id} {t.is_active ? "" : "• inativo"}
                  </p>
                </div>
                <button onClick={() => setDirectorsFor(t.id)} className="p-2 text-muted-foreground hover:text-foreground" title="Diretores">
                  <UserPlus className="h-4 w-4" />
                </button>
                <button onClick={() => { setEditing(t); setIsNew(false); }} className="p-2 text-muted-foreground hover:text-foreground" title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => del(t.id)} className="p-2 text-destructive hover:opacity-80" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Link to="/admin" className="block text-center text-xs text-muted-foreground py-4 underline">Voltar ao painel</Link>
      </div>

      {editing && (
        <Modal onClose={() => { setEditing(null); setIsNew(false); }} title={isNew ? "Novo time" : `Editar: ${editing.name}`}>
          <div className="space-y-3">
            <Field label="ID (slug)" hint="Letras minúsculas, números e hífen. Ex: leoes-do-bairro">
              <Input value={editing.id} disabled={!isNew} onChange={(e) => setEditing({ ...editing, id: e.target.value.toLowerCase() })} />
            </Field>
            <Field label="Nome"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Apelido"><Input value={editing.nickname ?? ""} onChange={(e) => setEditing({ ...editing, nickname: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Bairro"><Input value={editing.neighborhood ?? ""} onChange={(e) => setEditing({ ...editing, neighborhood: e.target.value })} /></Field>
              <Field label="Cidade"><Input value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Fundação"><Input type="number" value={editing.founded ?? ""} onChange={(e) => setEditing({ ...editing, founded: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Mensalidade (R$)"><Input type="number" step="0.01" value={editing.monthly_price ?? ""} onChange={(e) => setEditing({ ...editing, monthly_price: e.target.value ? Number(e.target.value) : null })} /></Field>
            </div>
            <Field label="URL do escudo"><Input value={editing.crest_url ?? ""} onChange={(e) => setEditing({ ...editing, crest_url: e.target.value })} placeholder="https://..." /></Field>
            <Field label="Cores"><Input value={editing.colors ?? ""} onChange={(e) => setEditing({ ...editing, colors: e.target.value })} placeholder="Verde e branco" /></Field>
            <Field label="História"><Textarea rows={4} value={editing.story ?? ""} onChange={(e) => setEditing({ ...editing, story: e.target.value })} /></Field>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Localização para check-in</p>
              <Field label="Nome do estádio/campo"><Input value={editing.stadium_name ?? ""} onChange={(e) => setEditing({ ...editing, stadium_name: e.target.value })} placeholder="Campo do Atlético" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Latitude"><Input type="number" step="any" value={editing.stadium_latitude ?? ""} onChange={(e) => setEditing({ ...editing, stadium_latitude: e.target.value ? Number(e.target.value) : null })} placeholder="-23.5505" /></Field>
                <Field label="Longitude"><Input type="number" step="any" value={editing.stadium_longitude ?? ""} onChange={(e) => setEditing({ ...editing, stadium_longitude: e.target.value ? Number(e.target.value) : null })} placeholder="-46.6333" /></Field>
              </div>
              <Field label="Raio permitido (metros)" hint="Recomendado: 150 a 300 metros."><Input type="number" min="50" max="2000" value={editing.checkin_radius_m} onChange={(e) => setEditing({ ...editing, checkin_radius_m: Number(e.target.value) })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Ativo (visível no app)
            </label>
            <Button className="w-full" disabled={saving} onClick={save}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </Modal>
      )}

      {directorsFor && (
        <DirectorsModal teamId={directorsFor} onClose={() => setDirectorsFor(null)} />
      )}
    </MobileShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
          <h3 className="font-display text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function DirectorsModal({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const list = useServerFn(adminListDirectors);
  const link = useServerFn(adminLinkDirector);
  const unlink = useServerFn(adminUnlinkDirector);
  const [rows, setRows] = useState<Array<{ id: string; email: string | null; role: string }> | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    try { setRows(await list({ data: { teamId } }) as any); } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { reload(); }, [teamId]);

  async function add() {
    if (!email) return;
    setBusy(true);
    try { await link({ data: { teamId, email: email.trim() } }); toast.success("Diretor vinculado!"); setEmail(""); await reload(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }
  async function rm(id: string) {
    if (!confirm("Remover este diretor do time?")) return;
    try { await unlink({ data: { linkId: id } }); toast.success("Removido"); await reload(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <Modal title={`Diretores · ${teamId}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={add} disabled={busy}>Vincular</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">A pessoa precisa já ter uma conta no app.</p>
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum diretor vinculado.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                <span className="text-sm truncate">{r.email ?? r.id}</span>
                <button onClick={() => rm(r.id)} className="text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
