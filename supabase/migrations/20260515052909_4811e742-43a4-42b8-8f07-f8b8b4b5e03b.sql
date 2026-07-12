
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS twitter text,
  ADD COLUMN IF NOT EXISTS favorite_team_id text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP FUNCTION IF EXISTS public.get_global_top_supporters(text, integer);
CREATE FUNCTION public.get_global_top_supporters(check_env text DEFAULT 'sandbox'::text, lim integer DEFAULT 50)
 RETURNS TABLE(rank bigint, user_id uuid, display_name text, avatar_url text, monthly_cents bigint, team_count bigint)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH active AS (
    SELECT s.user_id, s.team_id, COALESCE(s.unit_amount, 0) AS amt
    FROM public.subscriptions s
    WHERE s.environment = check_env
      AND s.status IN ('active','trialing','past_due')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ), agg AS (
    SELECT user_id, SUM(amt)::bigint AS monthly_cents,
           COUNT(DISTINCT team_id)::bigint AS team_count
    FROM active GROUP BY user_id
  )
  SELECT ROW_NUMBER() OVER (ORDER BY a.monthly_cents DESC, a.team_count DESC, p.display_name)::bigint,
    a.user_id, COALESCE(p.display_name, 'Apoiador'), p.avatar_url,
    a.monthly_cents, a.team_count
  FROM agg a LEFT JOIN public.profiles p ON p.id = a.user_id
  ORDER BY a.monthly_cents DESC, a.team_count DESC, p.display_name
  LIMIT lim;
$$;

DROP FUNCTION IF EXISTS public.get_team_top_supporters(text, text, integer);
CREATE FUNCTION public.get_team_top_supporters(team_id_in text, check_env text DEFAULT 'sandbox'::text, lim integer DEFAULT 5)
 RETURNS TABLE(rank bigint, user_id uuid, display_name text, avatar_url text, monthly_cents bigint)
 LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH active AS (
    SELECT s.user_id, COALESCE(s.unit_amount, 0) AS amt
    FROM public.subscriptions s
    WHERE s.environment = check_env AND s.team_id = team_id_in
      AND s.status IN ('active','trialing','past_due')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ), agg AS (
    SELECT user_id, SUM(amt)::bigint AS monthly_cents
    FROM active GROUP BY user_id
  )
  SELECT ROW_NUMBER() OVER (ORDER BY a.monthly_cents DESC, p.display_name)::bigint,
    a.user_id, COALESCE(p.display_name, 'Apoiador'), p.avatar_url, a.monthly_cents
  FROM agg a LEFT JOIN public.profiles p ON p.id = a.user_id
  ORDER BY a.monthly_cents DESC, p.display_name
  LIMIT lim;
$$;
