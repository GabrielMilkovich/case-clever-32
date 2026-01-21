-- =====================================================
-- MÓDULO 5B: GERADOR DE PETIÇÃO INICIAL
-- Tabela para armazenar petições e relatórios gerados
-- =====================================================

-- 1. Tabela de petições geradas
CREATE TABLE IF NOT EXISTS public.petitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  calculation_run_id UUID REFERENCES public.calculation_runs(id) ON DELETE SET NULL,
  
  -- Tipo e status
  tipo TEXT NOT NULL DEFAULT 'inicial', -- 'inicial', 'replica', 'contestacao', 'liquidacao'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'generating', 'completed', 'error'
  titulo TEXT,
  
  -- Seções da petição (JSONB para flexibilidade)
  narrativa_fatos TEXT, -- Narrativa dos fatos baseada nas evidências
  fundamentacao_juridica TEXT, -- Fundamentação legal e teses
  pedidos JSONB DEFAULT '[]', -- Array de pedidos com valores
  ressalvas TEXT, -- Texto padrão para documentos faltantes
  
  -- Conteúdo final gerado
  conteudo_completo TEXT, -- Petição completa montada
  memoria_calculo_html TEXT, -- Tabela HTML da memória de cálculo
  
  -- Metadados
  facts_snapshot JSONB DEFAULT '{}', -- Snapshot dos fatos usados
  theses_used JSONB DEFAULT '[]', -- Teses jurídicas aplicadas
  template_id TEXT, -- Template utilizado (futuro)
  
  -- Controle de geração
  generation_config JSONB DEFAULT '{}', -- Configurações usadas na geração
  generation_time_ms INTEGER,
  ai_model_used TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_edited_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_petitions_case_id ON public.petitions(case_id);
CREATE INDEX IF NOT EXISTS idx_petitions_status ON public.petitions(status);
CREATE INDEX IF NOT EXISTS idx_petitions_tipo ON public.petitions(tipo);

-- Enable RLS
ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their case petitions"
ON public.petitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = petitions.case_id
    AND c.criado_por = auth.uid()
  )
);

CREATE POLICY "Users can create petitions for their cases"
ON public.petitions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = petitions.case_id
    AND c.criado_por = auth.uid()
  )
);

CREATE POLICY "Users can update their case petitions"
ON public.petitions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = petitions.case_id
    AND c.criado_por = auth.uid()
  )
);

CREATE POLICY "Users can delete their case petitions"
ON public.petitions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = petitions.case_id
    AND c.criado_por = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_petitions_updated_at
  BEFORE UPDATE ON public.petitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela de templates de petição (futuro)
CREATE TABLE IF NOT EXISTS public.petition_templates (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'inicial', 'replica', etc.
  descricao TEXT,
  estrutura JSONB NOT NULL DEFAULT '{}', -- Estrutura do template
  variaveis JSONB DEFAULT '[]', -- Variáveis disponíveis
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Templates padrão
INSERT INTO public.petition_templates (id, nome, tipo, descricao, estrutura, variaveis)
VALUES 
(
  'inicial_trabalhista_v1',
  'Petição Inicial Trabalhista - Padrão',
  'inicial',
  'Modelo padrão de petição inicial trabalhista com todos os itens exigidos pelo Art. 840 da CLT',
  '{
    "secoes": [
      {"id": "qualificacao", "titulo": "Qualificação das Partes", "obrigatoria": true},
      {"id": "fatos", "titulo": "Dos Fatos", "obrigatoria": true},
      {"id": "fundamentacao", "titulo": "Do Direito", "obrigatoria": true},
      {"id": "pedidos", "titulo": "Dos Pedidos", "obrigatoria": true},
      {"id": "valores", "titulo": "Do Valor da Causa", "obrigatoria": true},
      {"id": "provas", "titulo": "Das Provas", "obrigatoria": false},
      {"id": "encerramento", "titulo": "Requerimentos Finais", "obrigatoria": true}
    ]
  }'::jsonb,
  '[
    {"nome": "reclamante_nome", "tipo": "text"},
    {"nome": "reclamante_cpf", "tipo": "text"},
    {"nome": "reclamada_razao", "tipo": "text"},
    {"nome": "reclamada_cnpj", "tipo": "text"},
    {"nome": "data_admissao", "tipo": "date"},
    {"nome": "data_demissao", "tipo": "date"},
    {"nome": "salario_base", "tipo": "money"},
    {"nome": "cargo", "tipo": "text"}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;