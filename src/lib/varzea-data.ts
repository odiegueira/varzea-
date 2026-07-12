export type Tier = "Bronze" | "Prata" | "Ouro" | "Lenda da Várzea";

export function getTier(points: number): { tier: Tier; next: number; color: string } {
  if (points >= 2000) return { tier: "Lenda da Várzea", next: 0, color: "legend" };
  if (points >= 1000) return { tier: "Ouro", next: 2000, color: "gold" };
  if (points >= 400) return { tier: "Prata", next: 1000, color: "silver" };
  return { tier: "Bronze", next: 400, color: "bronze" };
}

export const POINTS_PER_SUBSCRIPTION = 320;

export type TierStep = {
  tier: Tier;
  min: number;
  perk: string;
};

export const TIER_LADDER: TierStep[] = [
  { tier: "Bronze", min: 0, perk: "Carteirinha digital + descontos básicos" },
  { tier: "Prata", min: 400, perk: "Destaque no ranking do time" },
  { tier: "Ouro", min: 1000, perk: "Brindes oficiais e bastidores do clube" },
  { tier: "Lenda da Várzea", min: 2000, perk: "Nome eternizado no mural do time" },
];

export function getTierProgress(points: number) {
  const current = [...TIER_LADDER].reverse().find((t) => points >= t.min) ?? TIER_LADDER[0];
  const idx = TIER_LADDER.findIndex((t) => t.tier === current.tier);
  const next = TIER_LADDER[idx + 1] ?? null;
  const start = current.min;
  const end = next?.min ?? current.min;
  const span = Math.max(1, end - start);
  const progress = next ? Math.min(100, Math.max(0, ((points - start) / span) * 100)) : 100;
  const missing = next ? Math.max(0, end - points) : 0;
  const subsToNext = next ? Math.ceil(missing / POINTS_PER_SUBSCRIPTION) : 0;
  return { current, next, progress, missing, subsToNext };
}
