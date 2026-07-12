import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdmin } from "./mercadopago.server";

const inputSchema = z.object({
  teamId: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(5000).optional(),
});

function distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const getCheckinInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ teamId: z.string().regex(/^[a-z0-9-]+$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = getAdmin();
    const { data: team, error } = await admin.from("teams")
      .select("id,name,stadium_name,stadium_latitude,stadium_longitude,checkin_radius_m")
      .eq("id", data.teamId).single();
    if (error || !team) throw new Error("Time não encontrado.");
    const today = new Date().toISOString().slice(0, 10);
    const { data: done } = await admin.from("game_checkins")
      .select("points,created_at,distance_m").eq("user_id", context.userId)
      .eq("team_id", data.teamId).eq("game_date", today).maybeSingle();
    const { data: all } = await admin.from("game_checkins").select("points").eq("user_id", context.userId);
    return { ...team, checkedInToday: !!done, checkin: done, totalPoints: (all ?? []).reduce((n, r) => n + r.points, 0) };
  });

export const confirmLocationCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const admin = getAdmin();
    const { data: subscription } = await admin.from("subscriptions").select("id")
      .eq("user_id", context.userId).eq("team_id", data.teamId)
      .in("status", ["active", "trialing"]).limit(1).maybeSingle();
    if (!subscription) throw new Error("Você precisa ter uma carteirinha ativa deste time.");

    const { data: team } = await admin.from("teams")
      .select("stadium_latitude,stadium_longitude,checkin_radius_m")
      .eq("id", data.teamId).single();
    if (!team || team.stadium_latitude == null || team.stadium_longitude == null) {
      throw new Error("O estádio ainda não possui localização cadastrada.");
    }
    if (data.accuracy && data.accuracy > 150) {
      throw new Error("Sinal de localização impreciso. Vá para uma área aberta e tente novamente.");
    }
    const distance = distanceMetres(data.latitude, data.longitude, team.stadium_latitude, team.stadium_longitude);
    const radius = team.checkin_radius_m ?? 250;
    if (distance > radius) {
      throw new Error(`Você está a ${Math.round(distance)} m do estádio. Aproxime-se até ${radius} m para fazer o check-in.`);
    }
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await admin.from("game_checkins").select("points,distance_m")
      .eq("user_id", context.userId).eq("team_id", data.teamId).eq("game_date", today).maybeSingle();
    if (existing) return { ok: true, alreadyDone: true, points: existing.points, distance: Math.round(existing.distance_m) };

    const { error } = await admin.from("game_checkins").insert({
      user_id: context.userId, team_id: data.teamId, game_date: today,
      latitude: data.latitude, longitude: data.longitude, accuracy_m: data.accuracy,
      distance_m: distance, points: 100,
    });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyDone: false, points: 100, distance: Math.round(distance) };
  });
