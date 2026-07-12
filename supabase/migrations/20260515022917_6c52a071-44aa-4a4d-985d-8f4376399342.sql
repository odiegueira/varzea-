-- PIX fields on team
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_key_type text;

-- Payout requests table (manual PIX payouts from platform to team)
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  pix_key text NOT NULL,
  pix_key_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | paid | rejected
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  paid_by uuid,
  proof_url text,
  notes text,
  environment text NOT NULL DEFAULT 'production',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_team ON public.payout_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Directors view own team payout_requests"
ON public.payout_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_team_director(auth.uid(), team_id));

CREATE POLICY "Directors create own team payout_requests"
ON public.payout_requests FOR INSERT
TO authenticated
WITH CHECK (is_team_director(auth.uid(), team_id) AND requested_by = auth.uid());

CREATE POLICY "Admins update payout_requests"
ON public.payout_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages payout_requests"
ON public.payout_requests FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_payout_requests_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();