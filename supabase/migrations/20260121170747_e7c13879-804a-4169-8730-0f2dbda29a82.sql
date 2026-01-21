-- Calculation profiles - preset configurations for different scenarios
CREATE TABLE public.calculation_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  config jsonb DEFAULT '{}',
  calculadoras_incluidas uuid[] DEFAULT '{}',
  ativo boolean DEFAULT true,
  criado_por uuid,
  criado_em timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calculation_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all active profiles (shared resource)
CREATE POLICY "Authenticated users can view active profiles"
ON public.calculation_profiles FOR SELECT
TO authenticated
USING (ativo = true);

-- Users can create their own profiles
CREATE POLICY "Users can create their own profiles"
ON public.calculation_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = criado_por);

-- Users can update their own profiles
CREATE POLICY "Users can update their own profiles"
ON public.calculation_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = criado_por);

-- Users can delete their own profiles
CREATE POLICY "Users can delete their own profiles"
ON public.calculation_profiles FOR DELETE
TO authenticated
USING (auth.uid() = criado_por);

-- Indexes
CREATE INDEX idx_calculation_profiles_nome ON public.calculation_profiles(nome);
CREATE INDEX idx_calculation_profiles_criado_por ON public.calculation_profiles(criado_por);