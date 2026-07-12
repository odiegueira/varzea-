import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdmin } from "./mercadopago.server";

const idRe = /^[a-z0-9-]+$/;

async function assertAdmin(userId: string) {
  const admin = getAdmin();
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

const teamSchema = z.object({
  id: z.string().min(2).max(64).regex(idRe, "Use letras minúsculas, números e hífen"),
  name: z.string().min(2).max(120),
  nickname: z.string().max(80).optional().nullable(),
  neighborhood: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  founded: z.number().int().min(1900).max(2100).optional().nullable(),
  monthly_price: z.number().min(0).max(10000).optional().nullable(),
  crest_url: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().url().max(2000).optional().nullable()
  ),
  colors: z.string().max(120).optional().nullable(),
  story: z.string().max(4000).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const adminListTeams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await getAdmin()
      .from("teams")
      .select("id,name,nickname,neighborhood,city,founded,monthly_price,crest_url,colors,story,is_active")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCreateTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => teamSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await getAdmin().from("teams").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => teamSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...rest } = data;
    const { error } = await getAdmin().from("teams").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().regex(idRe).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await getAdmin().from("teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListDirectors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ teamId: z.string().regex(idRe).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = getAdmin();
    const { data: links } = await admin
      .from("team_directors")
      .select("id,user_id,role,created_at")
      .eq("team_id", data.teamId);
    const result: Array<{ id: string; user_id: string; email: string | null; role: string; created_at: string }> = [];
    for (const l of links ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(l.user_id);
      result.push({
        id: l.id,
        user_id: l.user_id,
        email: u?.user?.email ?? null,
        role: l.role,
        created_at: l.created_at,
      });
    }
    return result;
  });

export const adminLinkDirector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      teamId: z.string().regex(idRe).max(64),
      email: z.string().email().max(254),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = getAdmin();
    // Find user by email by paginating
    let userId: string | null = null;
    let page = 1;
    while (page <= 20 && !userId) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const found = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase());
      if (found) userId = found.id;
      if (list.users.length < 200) break;
      page++;
    }
    if (!userId) throw new Error("Usuário não encontrado. Peça para ele criar uma conta primeiro.");
    const { error: insErr } = await admin
      .from("team_directors")
      .insert({ user_id: userId, team_id: data.teamId, role: "director" });
    if (insErr && !insErr.message.includes("duplicate")) throw new Error(insErr.message);
    // Ensure director role exists
    await admin.from("user_roles").insert({ user_id: userId, role: "director" }).then(() => {});
    return { ok: true };
  });

export const adminUnlinkDirector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ linkId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await getAdmin().from("team_directors").delete().eq("id", data.linkId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });