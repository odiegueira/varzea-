
CREATE TABLE public.teams (
  id text PRIMARY KEY,
  name text NOT NULL,
  nickname text,
  founded integer,
  neighborhood text,
  city text,
  colors text,
  story text,
  crest_url text,
  monthly_price numeric(10,2),
  stripe_account_id text UNIQUE,
  onboarding_status text NOT NULL DEFAULT 'not_started',
  payout_enabled boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 10.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'director',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
CREATE INDEX idx_team_directors_user ON public.team_directors(user_id);
CREATE INDEX idx_team_directors_team ON public.team_directors(team_id);

CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  stripe_payout_id text UNIQUE,
  stripe_account_id text,
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'brl',
  status text NOT NULL,
  arrival_date timestamptz,
  environment text NOT NULL DEFAULT 'sandbox',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payouts_team ON public.payouts(team_id);

-- Helper to avoid recursive policy references between teams and team_directors
CREATE OR REPLACE FUNCTION public.is_team_director(_user_id uuid, _team_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_directors
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Teams viewable by authenticated"
  ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Directors can update own team"
  ON public.teams FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_team_director(auth.uid(), id))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_team_director(auth.uid(), id));
CREATE POLICY "Admins can delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Team directors policies
CREATE POLICY "Directors can view own links"
  ON public.team_directors FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage team directors"
  ON public.team_directors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Payouts policies
CREATE POLICY "Directors can view team payouts"
  ON public.payouts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_team_director(auth.uid(), team_id));
CREATE POLICY "Service role manages payouts"
  ON public.payouts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER teams_set_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payouts_set_updated_at BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed teams
INSERT INTO public.teams (id, name, nickname, founded, neighborhood, city, colors, story, monthly_price) VALUES
  ('uniao-fc', 'União Vila Nova FC', 'Leão da Vila', 1989, 'Vila Nova', 'São Paulo', 'Verde e Ouro', 'Fundado por uma turma de amigos atrás da padaria do Seu Zé. Hoje é orgulho do bairro e referência na várzea paulistana.', 19.90),
  ('real-jardim', 'Real Jardim Esperança', 'Coração da Periferia', 1976, 'Jardim Esperança', 'São Paulo', 'Vermelho e Preto', 'Mais antigo do quadrante, o Real é tradição. Cada gol é festejado como se fosse um título mundial.', 24.90),
  ('atletico-bairro', 'Atlético do Bairro', 'Águia do Morro', 1995, 'Vila Esperança', 'São Paulo', 'Azul e Branco', 'O time do morro que voa alto. Formou jogadores que hoje brilham em clubes profissionais.', 14.90),
  ('santa-cruz', 'Santa Cruz da Várzea', 'Santo Guerreiro', 1982, 'Santa Cruz', 'São Paulo', 'Branco e Azul', 'Time de fé. Joga sempre no campo da igreja, com bênção do padre antes da partida.', 16.90),
  ('operario-rc', 'Operário Recreativo', 'Tropa de Aço', 1968, 'Mooca', 'São Paulo', 'Preto e Branco', 'Nascido na fábrica, hoje é símbolo de resistência operária. Várzea raíz.', 22.90),
  ('estrela-dalva', 'Estrela d''Alva FC', 'Brilho da Madrugada', 2001, 'Capão Redondo', 'São Paulo', 'Amarelo e Azul', 'Joga no campinho de terra desde o amanhecer. Estrela que nunca apaga.', 14.90);

INSERT INTO public.team_directors (team_id, user_id, role)
SELECT 'uniao-fc', u.id, 'owner'
FROM auth.users u
WHERE u.email = 'diieego9391@gmail.com'
ON CONFLICT DO NOTHING;
