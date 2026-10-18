CREATE TABLE public.formularios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  tipo text NOT NULL,
  cliente_nome text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  respostas jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.formularios TO service_role;
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.vistorias (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vistorias TO service_role;
ALTER TABLE public.vistorias ENABLE ROW LEVEL SECURITY;