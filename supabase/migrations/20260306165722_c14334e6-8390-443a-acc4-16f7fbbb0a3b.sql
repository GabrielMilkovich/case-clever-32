-- Add unique constraint on pjecalc_calculos(case_id) for upserts
ALTER TABLE public.pjecalc_calculos ADD CONSTRAINT pjecalc_calculos_case_id_key UNIQUE (case_id);

-- Add unique constraint on pjecalc_verba_base(calculo_id, nome) for upserts
ALTER TABLE public.pjecalc_verba_base ADD CONSTRAINT pjecalc_verba_base_calculo_id_nome_key UNIQUE (calculo_id, nome);