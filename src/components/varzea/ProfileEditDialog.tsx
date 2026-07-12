import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useTeams } from "@/hooks/useTeams";
import { Camera, Loader2 } from "lucide-react";

type ProfileRow = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram: string | null;
  tiktok: string | null;
  twitter: string | null;
  favorite_team_id: string | null;
};

export function ProfileEditDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const { teams } = useTeams();
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; nickname?: string };

  const [formName, setFormName] = useState("");
  const [formNick, setFormNick] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [twitter, setTwitter] = useState("");
  const [favTeam, setFavTeam] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    setFormName(meta.full_name ?? "");
    setFormNick(meta.nickname ?? "");
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name,avatar_url,bio,instagram,tiktok,twitter,favorite_team_id")
        .eq("id", user.id)
        .maybeSingle();
      const p = (data ?? {}) as Partial<ProfileRow>;
      setBio(p.bio ?? "");
      setInstagram(p.instagram ?? "");
      setTiktok(p.tiktok ?? "");
      setTwitter(p.twitter ?? "");
      setFavTeam(p.favorite_team_id ?? "");
      setAvatarUrl(p.avatar_url ?? null);
    })();
  }, [open, user, meta.full_name, meta.nickname]);

  async function handleAvatar(file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB).");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success("Foto carregada — clique em Salvar.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  }

  function clean(handle: string) {
    return handle.trim().replace(/^@+/, "");
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: formName.trim(), nickname: formNick.trim() },
      });
      if (authErr) throw authErr;
      const resolved = formNick.trim() || formName.trim().split(" ")[0] || "Apoiador";
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          display_name: resolved,
          avatar_url: avatarUrl,
          bio: bio.trim() || null,
          instagram: clean(instagram) || null,
          tiktok: clean(tiktok) || null,
          twitter: clean(twitter) || null,
          favorite_team_id: favTeam || null,
        })
        .eq("id", user.id);
      if (profErr) throw profErr;
      toast.success("Perfil atualizado!");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const initials =
    (formName || meta.full_name || user?.email || "A")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "A";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 rounded-full overflow-hidden bg-gradient-pitch flex items-center justify-center text-primary-foreground font-display text-xl border border-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs hover:border-primary transition disabled:opacity-50"
              >
                <Camera className="h-4 w-4" /> Trocar foto
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatar(f);
                  e.target.value = "";
                }}
              />
              <p className="text-[10px] text-muted-foreground mt-1">JPG/PNG até 5MB. Aparece no ranking.</p>
            </div>
          </div>

          {/* Identidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div>
              <Label htmlFor="nickname">Apelido</Label>
              <Input id="nickname" value={formNick} onChange={(e) => setFormNick(e.target.value)} placeholder="Como te chamam" />
            </div>
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder="Conta um pouco sobre você"
              rows={3}
            />
            <p className="text-[10px] text-muted-foreground text-right">{bio.length}/200</p>
          </div>

          {/* Time que torce */}
          <div>
            <Label htmlFor="fav_team">Time que torce</Label>
            <select
              id="fav_team"
              value={favTeam}
              onChange={(e) => setFavTeam(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">— Selecione —</option>
              {(teams ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Redes sociais */}
          <div className="space-y-2">
            <Label>Redes sociais</Label>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">Instagram</span>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seuusuario" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">TikTok</span>
                <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@seuusuario" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">X / Twitter</span>
                <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@seuusuario" />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">E-mail: {user?.email}</p>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-xl border border-border text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || uploading}
            className="px-4 py-2 rounded-xl bg-gradient-gold text-gold-foreground font-display text-sm disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
