ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS stadium_name text,
  ADD COLUMN IF NOT EXISTS stadium_latitude double precision,
  ADD COLUMN IF NOT EXISTS stadium_longitude double precision,
  ADD COLUMN IF NOT EXISTS checkin_radius_m integer NOT NULL DEFAULT 250
    CHECK (checkin_radius_m BETWEEN 50 AND 2000);

CREATE TABLE IF NOT EXISTS public.game_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  game_date date NOT NULL DEFAULT CURRENT_DATE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy_m double precision,
  distance_m double precision NOT NULL,
  points integer NOT NULL DEFAULT 100 CHECK (points > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id, game_date)
);

CREATE INDEX IF NOT EXISTS idx_game_checkins_user ON public.game_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_game_checkins_team_date ON public.game_checkins(team_id, game_date);

ALTER TABLE public.game_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own game checkins"
  ON public.game_checkins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages game checkins"
  ON public.game_checkins FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

