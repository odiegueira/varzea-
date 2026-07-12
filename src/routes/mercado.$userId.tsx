import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/varzea/MobileShell";
import { TopBar } from "@/components/varzea/TopBar";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  POSITION_LABEL, FOOT_LABEL, waLink, youtubeEmbed, type Player,
} from "@/lib/players";
import { MapPin, MessageCircle, Pencil, Ruler, Target, Calendar } from "lucide-react";

export const Route = createFileRoute("/mercado/$userId")({
  component: () => (<RequireAuth><PlayerPage /></RequireAuth>),
});

function PlayerPage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const [p, setP] = useState<Player | null | undefined>(undefined);

  useEffect(() => {
    supabase.from("players").select("*").eq("user_id", userId).maybeSingle()
      .then(({ data }) => setP((data as Player | null) ?? null));
  }, [userId]);

  if (p === undefined) {
    return <MobileShell><TopBar back="/mercado" title="JOGADOR" /><p className="px-4 pt-6 text-sm text-muted-foreground">Carregando...</p></MobileShell>;
  }
  if (p === null) {
    return (
      <MobileShell><TopBar back="/mercado" title="JOGADOR" />
        <p className="px-4 pt-6 text-sm text-muted-foreground">Jogador não encontrado.</p>
      </MobileShell>
    );
  }

  const embed = p.video_url ? youtubeEmbed(p.video_url) : null;
  const isMine = user?.id === p.user_id;

  return (
    <MobileShell>
      <TopBar back="/mercado" title="JOGADOR" />
      <div className="px-4 pt-2 pb-6 space-y-5">
        <div className="rounded-2xl overflow-hidden bg-card border border-border">
          <div className="aspect-[4/5] bg-muted relative">
            <img src={p.avatar_url} alt={p.display_name} className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-2xl leading-tight">{p.display_name}</p>
              <span className="text-[10px] uppercase tracking-wider bg-primary/15 text-primary px-2 py-1 rounded-full">
                {POSITION_LABEL[p.position]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {p.city}/{p.state} · {p.age} anos
            </p>
            {p.bio && <p className="text-sm mt-1">{p.bio}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat icon={<Ruler className="h-4 w-4" />} label="Altura" value={`${p.height_cm} cm`} />
          <Stat icon={<Target className="h-4 w-4" />} label="Gols" value={`${p.goals_season}`} />
          <Stat icon={<Calendar className="h-4 w-4" />} label="Pé" value={FOOT_LABEL[p.dominant_foot].replace("Pé ", "")} />
        </div>

        {(p.availability.days.length > 0 || p.availability.periods.length > 0) && (
          <Section title="Disponibilidade">
            <p className="text-sm text-muted-foreground">
              {p.availability.days.length ? p.availability.days.join(", ").toUpperCase() : "Qualquer dia"}
              {" · "}
              {p.availability.periods.length ? p.availability.periods.join(", ") : "Qualquer período"}
            </p>
          </Section>
        )}

        {p.previous_clubs.length > 0 && (
          <Section title="Onde já jogou">
            <ul className="flex flex-wrap gap-2">
              {p.previous_clubs.map((c) => (
                <li key={c} className="text-xs px-2 py-1 rounded-full bg-muted text-foreground">{c}</li>
              ))}
            </ul>
          </Section>
        )}

        {p.gallery_urls.length > 0 && (
          <Section title="Galeria">
            <div className="grid grid-cols-3 gap-2">
              {p.gallery_urls.map((u) => (
                <img key={u} src={u} alt="" loading="lazy" className="aspect-square object-cover rounded-lg" />
              ))}
            </div>
          </Section>
        )}

        {embed && (
          <Section title="Vídeo">
            <div className="aspect-video rounded-xl overflow-hidden">
              <iframe src={embed} className="w-full h-full" allowFullScreen title="Vídeo do jogador" />
            </div>
          </Section>
        )}

        <div className="flex gap-2">
          <a
            href={waLink(p.whatsapp_e164, p.display_name.split(" ")[0])}
            target="_blank" rel="noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 bg-primary text-primary-foreground font-semibold uppercase tracking-wider text-sm"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          {isMine && (
            <Link
              to="/mercado/editar"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 border border-border text-sm uppercase tracking-wider"
            >
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          )}
        </div>
      </div>
    </MobileShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <div className="flex items-center justify-center text-muted-foreground">{icon}</div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
      <p className="font-display text-base mt-0.5">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{title}</h2>
      {children}
    </section>
  );
}