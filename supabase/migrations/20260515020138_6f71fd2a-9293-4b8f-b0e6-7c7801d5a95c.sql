
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS mp_user_id text,
  ADD COLUMN IF NOT EXISTS mp_access_token text,
  ADD COLUMN IF NOT EXISTS mp_refresh_token text,
  ADD COLUMN IF NOT EXISTS mp_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS mp_public_key text,
  ADD COLUMN IF NOT EXISTS mp_connected_at timestamptz;

CREATE TABLE IF NOT EXISTS public.mp_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL,
  user_id uuid,
  subscription_id uuid,
  mp_payment_id text UNIQUE,
  mp_preapproval_id text,
  status text NOT NULL,
  amount_cents bigint NOT NULL DEFAULT 0,
  platform_fee_cents bigint NOT NULL DEFAULT 0,
  net_team_cents bigint NOT NULL DEFAULT 0,
  payment_method text,
  paid_at timestamptz,
  raw jsonb,
  environment text NOT NULL DEFAULT 'production',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mp_payments_team ON public.mp_payments(team_id);
CREATE INDEX IF NOT EXISTS idx_mp_payments_user ON public.mp_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_payments_preapproval ON public.mp_payments(mp_preapproval_id);

ALTER TABLE public.mp_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Directors view own team mp_payments"
  ON public.mp_payments FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_team_director(auth.uid(), team_id));

CREATE POLICY "Service role manages mp_payments"
  ON public.mp_payments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER mp_payments_set_updated_at
  BEFORE UPDATE ON public.mp_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
