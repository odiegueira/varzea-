ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_age_check;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_height_cm_check;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_goals_season_check;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_state_check;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_whatsapp_e164_check;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_bio_check;