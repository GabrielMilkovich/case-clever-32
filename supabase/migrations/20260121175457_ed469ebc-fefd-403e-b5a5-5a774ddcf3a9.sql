-- Adicionar campo de citação original na tabela facts
ALTER TABLE public.facts 
ADD COLUMN citacao TEXT,
ADD COLUMN pagina INTEGER;

-- Comentários para documentação
COMMENT ON COLUMN public.facts.citacao IS 'Trecho exato do documento onde o fato foi encontrado';
COMMENT ON COLUMN public.facts.pagina IS 'Número da página do documento onde o fato foi encontrado';