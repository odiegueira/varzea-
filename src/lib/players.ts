import { z } from "zod";

export const POSITIONS = ["goleiro", "zagueiro", "lateral", "volante", "meia", "atacante"] as const;
export type Position = (typeof POSITIONS)[number];

export const FEET = ["direito", "esquerdo", "ambidestro"] as const;
export type Foot = (typeof FEET)[number];

export const POSITION_LABEL: Record<Position, string> = {
  goleiro: "Goleiro",
  zagueiro: "Zagueiro",
  lateral: "Lateral",
  volante: "Volante",
  meia: "Meia",
  atacante: "Atacante",
};

export const FOOT_LABEL: Record<Foot, string> = {
  direito: "Pé direito",
  esquerdo: "Pé esquerdo",
  ambidestro: "Ambidestro",
};

export const DAYS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;
export const PERIODS = ["manha", "tarde", "noite"] as const;

export const playerSchema = z.object({
  display_name: z.string().trim().min(1, { message: "Informe seu nome" }).max(60, { message: "Nome muito longo" }),
  age: z.coerce.number({ invalid_type_error: "Informe a idade" }).transform((n) => Math.trunc(n || 0)),
  city: z.string().trim().min(1, { message: "Informe a cidade" }).max(60, { message: "Cidade muito longa" }),
  state: z.string().trim().max(10, { message: "UF inválida" }).transform((s) => s.toUpperCase()),
  position: z.enum(POSITIONS, { errorMap: () => ({ message: "Escolha uma posição" }) }),
  dominant_foot: z.enum(FEET, { errorMap: () => ({ message: "Escolha o pé dominante" }) }),
  height_cm: z.coerce.number({ invalid_type_error: "Informe a altura" }).transform((n) => Math.trunc(n || 0)),
  avatar_url: z.string().url({ message: "Envie uma foto principal antes de salvar" }),
  gallery_urls: z.array(z.string().url()).max(6).default([]),
  video_url: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  bio: z.string().trim().max(500, { message: "Bio muito longa" }).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  goals_season: z.coerce.number().transform((n) => Math.max(0, Math.trunc(n || 0))).default(0),
  previous_clubs: z.array(z.string().trim().min(1)).max(20).default([]),
  availability: z.object({
    days: z.array(z.enum(DAYS)).default([]),
    periods: z.array(z.enum(PERIODS)).default([]),
  }).default({ days: [], periods: [] }),
  whatsapp_e164: z.string().min(1, { message: "Informe seu WhatsApp" }).transform((v) => v.replace(/\D/g, "")),
});

export type PlayerInput = z.input<typeof playerSchema>;
export type Player = {
  user_id: string;
  display_name: string;
  age: number;
  city: string;
  state: string;
  position: Position;
  dominant_foot: Foot;
  height_cm: number;
  avatar_url: string;
  gallery_urls: string[];
  video_url: string | null;
  bio: string | null;
  goals_season: number;
  previous_clubs: string[];
  availability: { days: string[]; periods: string[] };
  whatsapp_e164: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export function waLink(e164: string, name?: string) {
  const msg = encodeURIComponent(
    `Olá${name ? `, ${name}` : ""}! Vi seu perfil no Mercado de Jogadores do Várzea+ e queria conversar.`,
  );
  return `https://wa.me/${e164}?text=${msg}`;
}

export function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {
    return null;
  }
  return null;
}