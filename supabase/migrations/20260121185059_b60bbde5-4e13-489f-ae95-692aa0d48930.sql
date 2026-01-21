-- Fix RLS for petition_templates table
ALTER TABLE public.petition_templates ENABLE ROW LEVEL SECURITY;

-- Templates são públicos para leitura (todos os usuários autenticados podem ler)
CREATE POLICY "Authenticated users can view petition templates"
ON public.petition_templates
FOR SELECT
TO authenticated
USING (true);