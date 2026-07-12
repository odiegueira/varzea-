
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  discount text NOT NULL,
  icon text NOT NULL DEFAULT '🏷️',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active partners"
  ON public.partners FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Directors can insert partners"
  ON public.partners FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Directors can update partners"
  ON public.partners FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Directors can delete partners"
  ON public.partners FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER partners_set_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
