-- 1) unit_amount on subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS unit_amount integer;

-- Backfill known plan amounts (BRL cents)
UPDATE public.subscriptions SET unit_amount = CASE price_id
  WHEN 'apoio_apoiador_monthly' THEN 200
  WHEN 'apoio_bronze_monthly'   THEN 1490
  WHEN 'apoio_prata_monthly'    THEN 2490
  WHEN 'apoio_ouro_monthly'     THEN 4990
  WHEN 'apoio_lenda_monthly'    THEN 9990
  ELSE unit_amount
END
WHERE unit_amount IS NULL;

-- 2) profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Apoiador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- updated_at trigger function (shared)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) handle_new_user trigger: create profile from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  nick text := NULLIF(trim(meta->>'nickname'), '');
  full_name text := NULLIF(trim(meta->>'full_name'), '');
  first_name text;
  resolved text;
BEGIN
  IF full_name IS NOT NULL THEN
    first_name := split_part(full_name, ' ', 1);
  END IF;
  resolved := COALESCE(nick, first_name, 'Apoiador');
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, resolved)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.profiles (id, display_name)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'nickname'), ''),
    NULLIF(split_part(trim(u.raw_user_meta_data->>'full_name'), ' ', 1), ''),
    'Apoiador'
  )
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 4) Ranking RPC functions (security definer; only expose aggregates + display_name)
CREATE OR REPLACE FUNCTION public.get_global_top_supporters(check_env text DEFAULT 'sandbox', lim int DEFAULT 50)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  display_name text,
  monthly_cents bigint,
  team_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active AS (
    SELECT s.user_id, s.team_id, COALESCE(s.unit_amount, 0) AS amt
    FROM public.subscriptions s
    WHERE s.environment = check_env
      AND (
        (s.status IN ('active','trialing','past_due')
          AND (s.current_period_end IS NULL OR s.current_period_end > now()))
      )
  ), agg AS (
    SELECT user_id,
           SUM(amt)::bigint AS monthly_cents,
           COUNT(DISTINCT team_id)::bigint AS team_count
    FROM active
    GROUP BY user_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY a.monthly_cents DESC, a.team_count DESC, p.display_name)::bigint AS rank,
    a.user_id,
    COALESCE(p.display_name, 'Apoiador') AS display_name,
    a.monthly_cents,
    a.team_count
  FROM agg a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  ORDER BY a.monthly_cents DESC, a.team_count DESC, p.display_name
  LIMIT lim;
$$;

CREATE OR REPLACE FUNCTION public.get_team_top_supporters(team_id_in text, check_env text DEFAULT 'sandbox', lim int DEFAULT 5)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  display_name text,
  monthly_cents bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active AS (
    SELECT s.user_id, COALESCE(s.unit_amount, 0) AS amt
    FROM public.subscriptions s
    WHERE s.environment = check_env
      AND s.team_id = team_id_in
      AND (
        s.status IN ('active','trialing','past_due')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      )
  ), agg AS (
    SELECT user_id, SUM(amt)::bigint AS monthly_cents
    FROM active
    GROUP BY user_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY a.monthly_cents DESC, p.display_name)::bigint AS rank,
    a.user_id,
    COALESCE(p.display_name, 'Apoiador') AS display_name,
    a.monthly_cents
  FROM agg a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  ORDER BY a.monthly_cents DESC, p.display_name
  LIMIT lim;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_top_supporters(text,int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_top_supporters(text,text,int) TO anon, authenticated;