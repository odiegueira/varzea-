
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS team_id text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS products text,
  ADD COLUMN IF NOT EXISTS whatsapp text;
