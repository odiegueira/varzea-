import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  POSITIONS, FEET, POSITION_LABEL, FOOT_LABEL, DAYS, PERIODS, playerSchema,
  type Player, type Position, type Foot,
} from "@/lib/players";
import { Camera, Loader2, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/mercado/editar")({
  component: () => (<RequireAuth><EditarPlayer /></RequireAuth>),
});

type FormState = {
  display_name: string; age: string; city: string; state: string;
  position: Position; dominant_foot: Foot; height_cm: string;
  avatar_url: string; gallery_urls: string[]; video_url: string;
  bio: string; goals_season: string; previous_clubs: string;
  days: string[]; periods: string[]; whatsapp_e164: string;
};

const empty: FormState = {
  display_name: "", age: "", city: "", state: "",
  position: "atacante", dominant_foot: "direito", height_cm: "",
  avatar_url: "", gallery_urls: [], video_url: "",
  bio: "", goals_season: "0", previous_clubs: "",
  days: [], periods: [], whatsapp_e164: "",
};

function EditarPlayer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [f, setF] = useState<FormState>(empty);
  const avatarInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("players").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      const p = data as Player | null;
      if (p) {
        setF({
          display_name: p.display_name, age: String(p.age), city: p.city, state: p.state,
          position: p.position, dominant_foot: p.dominant_foot, height_cm: String(p.height_cm),
          avatar_url: p.avatar_url, gallery_urls: p.gallery_urls ?? [], video_url: p.video_url ?? "",
          bio: p.bio ?? "", goals_season: String(p.goals_season), previous_clubs: (p.previous_clubs ?? []).join(", "),
          days: p.availability?.days ?? [], periods: p.availability?.periods ?? [],
          whatsapp_e164: p.whatsapp_e164,
        });
      }
      setLoading(false);
    });
  }, [user]);

  async function uploadFile(file: File, kind: "avatar" | "gallery"): Promise<string | null> {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = kind === "avatar"
      ? `players/${user.id}/avatar-${Date.now()}.${ext}`
      : `players/${user.id}/gallery/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("player-media").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error(`Falha no upload: ${error.message}`); return null; }
    return supabase.storage.from("player-media").getPublicUrl(path).data.publicUrl;
  }

  async function onAvatar(file: File) {
    setUploadingAvatar(true);
    const url = await uploadFile(file, "avatar");
    setUploadingAvatar(false);
    if (url) setF((s) => ({ ...s, avatar_url: url }));
  }

  async function onGallery(files: FileList) {
    setUploadingGallery(true);
    const remaining = Math.max(0, 6 - f.gallery_urls.length);
    const list = Array.from(files).slice(0, remaining);
    const urls: string[] = [];
    for (const file of list) {
      const u = await uploadFile(file, "gallery");
      if (u) urls.push(u);
    }
    setUploadingGallery(false);
    setF((s) => ({ ...s, gallery_urls: [...s.gallery_urls, ...urls] }));
  }

  async function save() {
    if (!user) return;
    if (!f.avatar_url) { toast.error("Envie uma foto principal antes de salvar."); return; }
    const cleanWa = f.whatsapp_e164.replace(/\D/g, "");
    const parsed = playerSchema.safeParse({
      display_name: f.display_name,
      age: f.age,
      city: f.city,
      state: f.state,
      position: f.position,
      dominant_foot: f.dominant_foot,
      height_cm: f.height_cm,
      avatar_url: f.avatar_url,
      gallery_urls: f.gallery_urls,
      video_url: f.video_url,
      bio: f.bio,
      goals_season: f.goals_season,
      previous_clubs: f.previous_clubs.split(",").map((s) => s.trim()).filter(Boolean),
      availability: { days: f.days, periods: f.periods },
      whatsapp_e164: cleanWa,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(`${first.path.join(".") || "campo"}: ${first.message}`);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("players").upsert({
      user_id: user.id,
      ...parsed.data,
      is_published: true,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil salvo!");
    navigate({ to: "/mercado/$userId", params: { userId: user.id } });
  }

  async function destroy() {
    if (!user) return;
    if (!confirm("Remover seu perfil do mercado?")) return;
    const { error } = await supabase.from("players").delete().eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil removido.");
    navigate({ to: "/mercado" });
  }

  if (loading) {
    return <MobileShell><TopBar back="/mercado" title="MEU PERFIL" /><p className="px-4 pt-6 text-sm text-muted-foreground">Carregando...</p></MobileShell>;
  }

  return (
    <MobileShell>
      <TopBar back="/mercado" title="MEU PERFIL" />
      <div className="px-4 pt-2 pb-8 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => avatarInput.current?.click()}
            className="relative h-32 w-32 rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center"
          >
            {f.avatar_url
              ? <img src={f.avatar_url} alt="avatar" className="h-full w-full object-cover" />
              : <Camera className="h-8 w-8 text-muted-foreground" />}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </button>
          <p className="text-xs text-muted-foreground">Foto principal</p>
          <input ref={avatarInput} type="file" accept="image/*" hidden
            onChange={(e) => { const file = e.target.files?.[0]; if (file) onAvatar(file); e.target.value = ""; }} />
        </div>

        <Field label="Nome de exibição">
          <input className="ipt" value={f.display_name} maxLength={60}
            onChange={(e) => setF({ ...f, display_name: e.target.value })} />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Idade">
            <input className="ipt" type="number" inputMode="numeric" value={f.age}
              onChange={(e) => setF({ ...f, age: e.target.value })} />
          </Field>
          <Field label="Altura (cm)">
            <input className="ipt" type="number" inputMode="numeric" value={f.height_cm}
              onChange={(e) => setF({ ...f, height_cm: e.target.value })} />
          </Field>
          <Field label="Gols">
            <input className="ipt" type="number" inputMode="numeric" value={f.goals_season}
              onChange={(e) => setF({ ...f, goals_season: e.target.value })} />
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_80px] gap-2">
          <Field label="Cidade">
            <input className="ipt" value={f.city} maxLength={60}
              onChange={(e) => setF({ ...f, city: e.target.value })} />
          </Field>
          <Field label="UF">
            <input className="ipt uppercase" maxLength={2} value={f.state}
              onChange={(e) => setF({ ...f, state: e.target.value.toUpperCase() })} />
          </Field>
        </div>

        <Field label="Posição">
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((p) => (
              <Chip key={p} active={f.position === p} onClick={() => setF({ ...f, position: p })}>
                {POSITION_LABEL[p]}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Pé dominante">
          <div className="flex gap-2">
            {FEET.map((p) => (
              <Chip key={p} active={f.dominant_foot === p} onClick={() => setF({ ...f, dominant_foot: p })}>
                {FOOT_LABEL[p]}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="WhatsApp (com DDI, só números)">
          <input className="ipt" placeholder="5511999999999" inputMode="numeric"
            value={f.whatsapp_e164}
            onChange={(e) => setF({ ...f, whatsapp_e164: e.target.value.replace(/\D/g, "") })} />
        </Field>

        <Field label="Bio (até 280)">
          <textarea className="ipt min-h-[80px]" maxLength={280} value={f.bio}
            onChange={(e) => setF({ ...f, bio: e.target.value })} />
        </Field>

        <Field label="Times anteriores (separe por vírgula)">
          <input className="ipt" value={f.previous_clubs}
            placeholder="Real Quebrada, Bola na Rede FC"
            onChange={(e) => setF({ ...f, previous_clubs: e.target.value })} />
        </Field>

        <Field label="Disponibilidade">
          <p className="text-[10px] text-muted-foreground mb-1">Dias</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {DAYS.map((d) => (
              <Chip key={d} active={f.days.includes(d)} onClick={() => setF({
                ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d],
              })}>{d.toUpperCase()}</Chip>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mb-1">Períodos</p>
          <div className="flex gap-2">
            {PERIODS.map((d) => (
              <Chip key={d} active={f.periods.includes(d)} onClick={() => setF({
                ...f, periods: f.periods.includes(d) ? f.periods.filter((x) => x !== d) : [...f.periods, d],
              })}>{d}</Chip>
            ))}
          </div>
        </Field>

        <Field label="Vídeo (link YouTube)">
          <input className="ipt" placeholder="https://youtube.com/watch?v=..." value={f.video_url}
            onChange={(e) => setF({ ...f, video_url: e.target.value })} />
        </Field>

        <Field label={`Galeria (${f.gallery_urls.length}/6)`}>
          <div className="grid grid-cols-3 gap-2">
            {f.gallery_urls.map((u) => (
              <div key={u} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                <img src={u} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setF({ ...f, gallery_urls: f.gallery_urls.filter((x) => x !== u) })}
                  className="absolute top-1 right-1 bg-black/70 rounded-full p-1 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {f.gallery_urls.length < 6 && (
              <button type="button" onClick={() => galleryInput.current?.click()}
                className="aspect-square rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                {uploadingGallery ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </button>
            )}
          </div>
          <input ref={galleryInput} type="file" accept="image/*" multiple hidden
            onChange={(e) => { if (e.target.files) onGallery(e.target.files); e.target.value = ""; }} />
        </Field>

        <div className="flex gap-2 pt-2">
          <button onClick={save} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 bg-primary text-primary-foreground font-semibold uppercase tracking-wider text-sm disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
          <button onClick={destroy} type="button"
            className="inline-flex items-center justify-center rounded-xl px-4 py-3 border border-destructive text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
      }`}
    >
      {children}
    </button>
  );
}