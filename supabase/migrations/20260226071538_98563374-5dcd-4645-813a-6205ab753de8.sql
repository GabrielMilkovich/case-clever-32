CREATE TABLE public.case_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.case_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view briefings of their cases" ON public.case_briefings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM cases c WHERE c.id = case_briefings.case_id AND c.criado_por = auth.uid()
  ));

CREATE POLICY "Users can insert briefings to their cases" ON public.case_briefings
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM cases c WHERE c.id = case_briefings.case_id AND c.criado_por = auth.uid()
  ));

CREATE POLICY "Users can update briefings of their cases" ON public.case_briefings
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM cases c WHERE c.id = case_briefings.case_id AND c.criado_por = auth.uid()
  ));

CREATE POLICY "Users can delete briefings of their cases" ON public.case_briefings
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM cases c WHERE c.id = case_briefings.case_id AND c.criado_por = auth.uid()
  ));