-- Tabela de ligação N:N entre Perfil e Versão da Calculadora
CREATE TABLE public.profile_calculators (
  profile_id uuid NOT NULL REFERENCES public.calculation_profiles(id) ON DELETE CASCADE,
  calculator_version_id uuid NOT NULL REFERENCES public.calculator_versions(id) ON DELETE CASCADE,
  criado_em timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, calculator_version_id)
);

-- Habilitar RLS
ALTER TABLE public.profile_calculators ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view profile calculators of active profiles"
ON public.profile_calculators FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM calculation_profiles cp 
    WHERE cp.id = profile_calculators.profile_id AND cp.ativo = true
  )
);

CREATE POLICY "Users can manage their own profile calculators"
ON public.profile_calculators FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM calculation_profiles cp 
    WHERE cp.id = profile_calculators.profile_id AND cp.criado_por = auth.uid()
  )
);

CREATE POLICY "Users can delete their own profile calculators"
ON public.profile_calculators FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM calculation_profiles cp 
    WHERE cp.id = profile_calculators.profile_id AND cp.criado_por = auth.uid()
  )
);