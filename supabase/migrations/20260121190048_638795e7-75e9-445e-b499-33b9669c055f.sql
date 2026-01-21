-- Add markdown template support to petition_templates
ALTER TABLE public.petition_templates 
ADD COLUMN IF NOT EXISTS content_markdown text,
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Create index for default template lookup
CREATE INDEX IF NOT EXISTS idx_petition_templates_default 
ON public.petition_templates(tipo, is_default) 
WHERE is_default = true;

-- Insert default template for petição inicial trabalhista
INSERT INTO public.petition_templates (id, nome, tipo, descricao, content_markdown, is_default, ativo, estrutura, variaveis)
VALUES (
  'tpl-inicial-trabalhista',
  'Petição Inicial Trabalhista - Padrão',
  'inicial',
  'Template padrão para petição inicial trabalhista com todos os placeholders necessários',
  E'# EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DA {{vara}} VARA DO TRABALHO DE {{comarca}}

---

**{{nome_reclamante}}**, {{qualificacao_reclamante}}, vem, respeitosamente, à presença de Vossa Excelência, por seu(sua) advogado(a) que esta subscreve, propor a presente

## RECLAMAÇÃO TRABALHISTA

em face de **{{nome_reclamada}}**, {{qualificacao_reclamada}}, pelos fatos e fundamentos a seguir expostos.

---

## I. DOS FATOS

{{narrativa_fatos}}

---

## II. DO DIREITO

{{fundamentacao_juridica}}

---

## III. DOS PEDIDOS

Ante o exposto, requer:

{{pedidos_lista}}

---

## IV. DO VALOR DA CAUSA

Atribui-se à presente demanda o valor de **{{valor_causa}}**, conforme Art. 840, §1º da CLT, discriminado na tabela abaixo:

{{pedidos_tabela}}

---

## V. DAS PROVAS

Protesta provar o alegado por todos os meios de prova em direito admitidos, especialmente documental, testemunhal e pericial, se necessário.

---

## VI. DAS RESSALVAS

{{ressalvas}}

---

**Termos em que,**
**Pede deferimento.**

{{cidade}}, {{data_extenso}}.

---

**{{nome_advogado}}**
OAB/{{uf_oab}} {{numero_oab}}

---

## ANEXO: MEMÓRIA DE CÁLCULO

{{memoria_calculo}}
',
  true,
  true,
  '{
    "secoes": ["fatos", "direito", "pedidos", "valor_causa", "provas", "ressalvas"],
    "formatacao": {"fonte": "Times New Roman", "tamanho": 12, "espacamento": 1.5}
  }'::jsonb,
  '[
    {"nome": "vara", "descricao": "Número da vara", "obrigatorio": false, "default": "___"},
    {"nome": "comarca", "descricao": "Cidade/Comarca", "obrigatorio": true},
    {"nome": "nome_reclamante", "descricao": "Nome completo do reclamante", "obrigatorio": true},
    {"nome": "qualificacao_reclamante", "descricao": "Qualificação do reclamante (nacionalidade, estado civil, CPF, endereço)", "obrigatorio": true},
    {"nome": "nome_reclamada", "descricao": "Razão social da reclamada", "obrigatorio": true},
    {"nome": "qualificacao_reclamada", "descricao": "Qualificação da reclamada (CNPJ, endereço)", "obrigatorio": true},
    {"nome": "narrativa_fatos", "descricao": "Texto narrativo dos fatos", "obrigatorio": true, "gerado": true},
    {"nome": "fundamentacao_juridica", "descricao": "Fundamentação legal", "obrigatorio": true, "gerado": true},
    {"nome": "pedidos_lista", "descricao": "Lista numerada de pedidos", "obrigatorio": true, "gerado": true},
    {"nome": "pedidos_tabela", "descricao": "Tabela de pedidos com valores", "obrigatorio": true, "gerado": true},
    {"nome": "valor_causa", "descricao": "Valor total formatado", "obrigatorio": true, "gerado": true},
    {"nome": "ressalvas", "descricao": "Ressalvas sobre estimativas", "obrigatorio": false, "gerado": true},
    {"nome": "cidade", "descricao": "Cidade do escritório", "obrigatorio": true},
    {"nome": "data_extenso", "descricao": "Data por extenso", "obrigatorio": true, "gerado": true},
    {"nome": "nome_advogado", "descricao": "Nome do advogado", "obrigatorio": true},
    {"nome": "uf_oab", "descricao": "Estado da OAB", "obrigatorio": true},
    {"nome": "numero_oab", "descricao": "Número da OAB", "obrigatorio": true},
    {"nome": "memoria_calculo", "descricao": "HTML da memória de cálculo", "obrigatorio": true, "gerado": true}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  content_markdown = EXCLUDED.content_markdown,
  is_default = EXCLUDED.is_default,
  variaveis = EXCLUDED.variaveis;