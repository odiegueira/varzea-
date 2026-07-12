import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Team = {
  id: string;
  name: string;
  nickname: string | null;
  neighborhood: string | null;
  city: string | null;
  founded: number | null;
  monthly_price: number | null;
  crest_url: string | null;
  colors: string | null;
  story: string | null;
};

const SELECT = "id,name,nickname,neighborhood,city,founded,monthly_price,crest_url,colors,story";

export function useTeams() {
  const [data, setData] = useState<Team[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows, error } = await supabase
        .from("teams")
        .select(SELECT)
        .eq("is_active", true)
        .order("name");
      if (cancelled) return;
      if (error) {
        console.error(error);
        setData([]);
        return;
      }
      setData((rows ?? []) as Team[]);
    })();
    return () => { cancelled = true; };
  }, []);
  return { teams: data, loading: data === null };
}

export function useTeam(teamId: string | undefined) {
  const [data, setData] = useState<Team | null | undefined>(undefined);
  useEffect(() => {
    if (!teamId) { setData(null); return; }
    let cancelled = false;
    (async () => {
      const { data: row, error } = await supabase
        .from("teams")
        .select(SELECT)
        .eq("id", teamId)
        .maybeSingle();
      if (cancelled) return;
      if (error) { console.error(error); setData(null); return; }
      setData((row ?? null) as Team | null);
    })();
    return () => { cancelled = true; };
  }, [teamId]);
  return { team: data === undefined ? null : data, loading: data === undefined };
}

export async function fetchTeamsByIds(ids: string[]): Promise<Record<string, Team>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("teams")
    .select(SELECT)
    .in("id", ids);
  if (error) { console.error(error); return {}; }
  const map: Record<string, Team> = {};
  for (const t of (data ?? []) as Team[]) map[t.id] = t;
  return map;
}