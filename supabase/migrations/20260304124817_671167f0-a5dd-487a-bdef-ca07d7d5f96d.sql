
-- Fix security definer views + add INSTEAD OF triggers for write compatibility

-- Set security invoker on all views
ALTER VIEW pjecalc_parametros SET (security_invoker = on);
ALTER VIEW pjecalc_dados_processo SET (security_invoker = on);
ALTER VIEW pjecalc_faltas SET (security_invoker = on);
ALTER VIEW pjecalc_ferias SET (security_invoker = on);
ALTER VIEW pjecalc_historico_salarial SET (security_invoker = on);
ALTER VIEW pjecalc_verbas SET (security_invoker = on);
ALTER VIEW pjecalc_liquidacao_resultado SET (security_invoker = on);
ALTER VIEW pjecalc_ocorrencias SET (security_invoker = on);
ALTER VIEW pjecalc_fgts_config SET (security_invoker = on);
ALTER VIEW pjecalc_cs_config SET (security_invoker = on);
ALTER VIEW pjecalc_ir_config SET (security_invoker = on);
ALTER VIEW pjecalc_correcao_config SET (security_invoker = on);
ALTER VIEW pjecalc_honorarios SET (security_invoker = on);
ALTER VIEW pjecalc_multas_config SET (security_invoker = on);
ALTER VIEW pjecalc_cartao_ponto SET (security_invoker = on);
ALTER VIEW pjecalc_fgts_ocorrencias SET (security_invoker = on);
ALTER VIEW pjecalc_cs_ocorrencias SET (security_invoker = on);
ALTER VIEW pjecalc_verba_ocorrencias SET (security_invoker = on);
ALTER VIEW pjecalc_custas_config SET (security_invoker = on);

-- Helper: get or create calculo_id for a case_id
CREATE OR REPLACE FUNCTION pjecalc_get_calculo_id(p_case_id UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO pjecalc_calculos (case_id, user_id) VALUES (p_case_id, auth.uid()) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;$$;

-- INSTEAD OF triggers for pjecalc_parametros
CREATE OR REPLACE FUNCTION pjecalc_parametros_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  UPDATE pjecalc_calculos SET
    data_admissao = NULLIF(NEW.data_admissao,'')::date,
    data_demissao = NULLIF(NEW.data_demissao,'')::date,
    data_ajuizamento = NULLIF(NEW.data_ajuizamento,'')::date,
    data_inicio_calculo = NULLIF(NEW.data_inicial,'')::date,
    data_fim_calculo = NULLIF(NEW.data_final,'')::date,
    tribunal = NEW.estado,
    vara = NEW.municipio,
    divisor_horas = COALESCE(NEW.carga_horaria_padrao, 220),
    observacoes = NEW.comentarios,
    updated_at = now()
  WHERE id = v_cid;
  NEW.id := v_cid;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_parametros_insert INSTEAD OF INSERT ON pjecalc_parametros FOR EACH ROW EXECUTE FUNCTION pjecalc_parametros_ioi();
CREATE TRIGGER pjecalc_parametros_update INSTEAD OF UPDATE ON pjecalc_parametros FOR EACH ROW EXECUTE FUNCTION pjecalc_parametros_ioi();

-- INSTEAD OF triggers for pjecalc_faltas
CREATE OR REPLACE FUNCTION pjecalc_faltas_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_evento_intervalo (calculo_id, tipo, data_inicio, data_fim, justificado, motivo, observacoes)
  VALUES (v_cid, COALESCE(NEW.tipo_falta, 'FALTA'), NULLIF(NEW.data_inicial,'')::date, NULLIF(NEW.data_final,'')::date, COALESCE(NEW.justificada, false), NEW.motivo, NEW.observacoes);
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_faltas_insert INSTEAD OF INSERT ON pjecalc_faltas FOR EACH ROW EXECUTE FUNCTION pjecalc_faltas_ioi();

CREATE OR REPLACE FUNCTION pjecalc_faltas_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE pjecalc_evento_intervalo SET
    data_inicio = COALESCE(NULLIF(NEW.data_inicial,'')::date, data_inicio),
    data_fim = COALESCE(NULLIF(NEW.data_final,'')::date, data_fim),
    justificado = COALESCE(NEW.justificada, justificado),
    motivo = COALESCE(NEW.motivo, motivo)
  WHERE id = NEW.id;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_faltas_update INSTEAD OF UPDATE ON pjecalc_faltas FOR EACH ROW EXECUTE FUNCTION pjecalc_faltas_iou();

CREATE OR REPLACE FUNCTION pjecalc_faltas_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM pjecalc_evento_intervalo WHERE id = OLD.id;
  RETURN OLD;
END;$$;
CREATE TRIGGER pjecalc_faltas_delete INSTEAD OF DELETE ON pjecalc_faltas FOR EACH ROW EXECUTE FUNCTION pjecalc_faltas_iod();

-- INSTEAD OF triggers for pjecalc_ferias
CREATE OR REPLACE FUNCTION pjecalc_ferias_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_evento_intervalo (
    calculo_id, tipo, data_inicio, data_fim,
    ferias_aquisitivo_inicio, ferias_aquisitivo_fim,
    ferias_concessivo_inicio, ferias_concessivo_fim,
    ferias_dias, ferias_abono, ferias_dias_abono, ferias_dobra, ferias_situacao,
    ferias_gozo2_inicio, ferias_gozo2_fim, ferias_gozo3_inicio, ferias_gozo3_fim,
    observacoes
  ) VALUES (
    v_cid, 'FERIAS',
    COALESCE(NULLIF(NEW.gozo_inicio,'')::date, NULLIF(NEW.periodo_aquisitivo_inicio,'')::date, CURRENT_DATE),
    COALESCE(NULLIF(NEW.gozo_fim,'')::date, NULLIF(NEW.periodo_aquisitivo_fim,'')::date, CURRENT_DATE),
    NULLIF(NEW.periodo_aquisitivo_inicio,'')::date, NULLIF(NEW.periodo_aquisitivo_fim,'')::date,
    NULLIF(NEW.periodo_concessivo_inicio,'')::date, NULLIF(NEW.periodo_concessivo_fim,'')::date,
    COALESCE(NEW.dias, 30), COALESCE(NEW.abono, false), COALESCE(NEW.dias_abono, 0),
    COALESCE(NEW.dobra, false), COALESCE(NEW.situacao, 'GOZADAS'),
    NULLIF(NEW.gozo2_inicio,'')::date, NULLIF(NEW.gozo2_fim,'')::date,
    NULLIF(NEW.gozo3_inicio,'')::date, NULLIF(NEW.gozo3_fim,'')::date,
    NEW.observacoes
  );
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_ferias_insert INSTEAD OF INSERT ON pjecalc_ferias FOR EACH ROW EXECUTE FUNCTION pjecalc_ferias_ioi();

CREATE OR REPLACE FUNCTION pjecalc_ferias_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE pjecalc_evento_intervalo SET
    ferias_situacao = COALESCE(NEW.situacao, ferias_situacao),
    ferias_dobra = COALESCE(NEW.dobra, ferias_dobra),
    ferias_abono = COALESCE(NEW.abono, ferias_abono)
  WHERE id = NEW.id;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_ferias_update INSTEAD OF UPDATE ON pjecalc_ferias FOR EACH ROW EXECUTE FUNCTION pjecalc_ferias_iou();

CREATE OR REPLACE FUNCTION pjecalc_ferias_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM pjecalc_evento_intervalo WHERE id = OLD.id; RETURN OLD;
END;$$;
CREATE TRIGGER pjecalc_ferias_delete INSTEAD OF DELETE ON pjecalc_ferias FOR EACH ROW EXECUTE FUNCTION pjecalc_ferias_iod();

-- INSTEAD OF triggers for pjecalc_historico_salarial
CREATE OR REPLACE FUNCTION pjecalc_hist_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_hist_salarial (calculo_id, nome, tipo_variacao, valor_fixo, incide_fgts, incide_inss, observacoes)
  VALUES (v_cid, NEW.nome, COALESCE(NEW.tipo_valor, 'VARIAVEL'), NEW.valor_informado, COALESCE(NEW.incidencia_fgts, true), COALESCE(NEW.incidencia_cs, true), NEW.observacoes)
  ON CONFLICT (calculo_id, nome) DO UPDATE SET valor_fixo = EXCLUDED.valor_fixo, observacoes = EXCLUDED.observacoes;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_hist_insert INSTEAD OF INSERT ON pjecalc_historico_salarial FOR EACH ROW EXECUTE FUNCTION pjecalc_hist_ioi();

CREATE OR REPLACE FUNCTION pjecalc_hist_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM pjecalc_hist_salarial WHERE id = OLD.id; RETURN OLD;
END;$$;
CREATE TRIGGER pjecalc_hist_delete INSTEAD OF DELETE ON pjecalc_historico_salarial FOR EACH ROW EXECUTE FUNCTION pjecalc_hist_iod();

-- INSTEAD OF triggers for pjecalc_verbas
CREATE OR REPLACE FUNCTION pjecalc_verbas_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_verba_base (calculo_id, nome, codigo, caracteristica, periodicidade, multiplicador, divisor, periodo_inicio, periodo_fim, ordem, ativa, observacoes)
  VALUES (v_cid, NEW.nome, NEW.codigo, COALESCE(NEW.caracteristica, 'COMUM'), COALESCE(NEW.ocorrencia_pagamento, 'MENSAL'),
    COALESCE(NEW.multiplicador, 1), COALESCE(NEW.divisor_informado, 1),
    NULLIF(NEW.periodo_inicio,'')::date, NULLIF(NEW.periodo_fim,'')::date,
    COALESCE(NEW.ordem, 0), COALESCE(NEW.ativa, true), NEW.observacoes)
  RETURNING id INTO NEW.id;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_verbas_insert INSTEAD OF INSERT ON pjecalc_verbas FOR EACH ROW EXECUTE FUNCTION pjecalc_verbas_ioi();

CREATE OR REPLACE FUNCTION pjecalc_verbas_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM pjecalc_verba_base WHERE id = OLD.id; RETURN OLD;
END;$$;
CREATE TRIGGER pjecalc_verbas_delete INSTEAD OF DELETE ON pjecalc_verbas FOR EACH ROW EXECUTE FUNCTION pjecalc_verbas_iod();

-- INSTEAD OF triggers for pjecalc_ocorrencias
CREATE OR REPLACE FUNCTION pjecalc_ocorr_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_ocorrencia_calculo (calculo_id, verba_base_id, tipo, nome, competencia, base_valor, multiplicador, divisor, quantidade, dobra, devido, pago, diferenca, correcao, juros, total, origem, ativa)
  VALUES (v_cid, NEW.verba_id, COALESCE(NEW.verba_nome, 'VERBA'), COALESCE(NEW.verba_nome, ''), NEW.competencia::date,
    COALESCE(NEW.base_valor, 0), COALESCE(NEW.multiplicador_valor, 1), COALESCE(NEW.divisor_valor, 1),
    COALESCE(NEW.quantidade_valor, 1), COALESCE(NEW.dobra, 1), COALESCE(NEW.devido, 0), COALESCE(NEW.pago, 0),
    COALESCE(NEW.diferenca, 0), COALESCE(NEW.correcao, 0), COALESCE(NEW.juros, 0), COALESCE(NEW.total, 0),
    COALESCE(NEW.origem, 'CALCULADA'), COALESCE(NEW.ativa, true));
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_ocorr_insert INSTEAD OF INSERT ON pjecalc_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_ocorr_ioi();

CREATE OR REPLACE FUNCTION pjecalc_ocorr_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE pjecalc_ocorrencia_calculo SET
    base_valor = COALESCE(NEW.base_valor, base_valor),
    multiplicador = COALESCE(NEW.multiplicador_valor, multiplicador),
    divisor = COALESCE(NEW.divisor_valor, divisor),
    quantidade = COALESCE(NEW.quantidade_valor, quantidade),
    dobra = COALESCE(NEW.dobra, dobra),
    devido = COALESCE(NEW.devido, devido),
    pago = COALESCE(NEW.pago, pago),
    diferenca = COALESCE(NEW.diferenca, diferenca),
    correcao = COALESCE(NEW.correcao, correcao),
    juros = COALESCE(NEW.juros, juros),
    total = COALESCE(NEW.total, total),
    origem = COALESCE(NEW.origem, origem),
    ativa = COALESCE(NEW.ativa, ativa),
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_ocorr_update INSTEAD OF UPDATE ON pjecalc_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_ocorr_iou();

CREATE OR REPLACE FUNCTION pjecalc_ocorr_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM pjecalc_ocorrencia_calculo WHERE id = OLD.id; RETURN OLD;
END;$$;
CREATE TRIGGER pjecalc_ocorr_delete INSTEAD OF DELETE ON pjecalc_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_ocorr_iod();

-- INSTEAD OF for pjecalc_liquidacao_resultado
CREATE OR REPLACE FUNCTION pjecalc_liq_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_resultado (calculo_id, total_bruto, total_liquido_antes_descontos, desconto_inss_reclamante, desconto_ir, desconto_inss_reclamado, honorarios, custas, fgts_depositar, fgts_multa_40, total_reclamante, total_reclamado, resumo_verbas, engine_version)
  VALUES (v_cid, COALESCE(NEW.total_bruto, 0), COALESCE(NEW.total_liquido, 0), COALESCE(NEW.inss_segurado, 0), COALESCE(NEW.irrf, 0), COALESCE(NEW.inss_patronal, 0), COALESCE(NEW.honorarios, 0), COALESCE(NEW.custas, 0), COALESCE(NEW.fgts_depositar, 0), COALESCE(NEW.fgts_multa_40, 0), COALESCE(NEW.total_reclamante, 0), COALESCE(NEW.total_reclamado, 0), COALESCE(NEW.resultado, '[]'::jsonb), NEW.engine_version)
  ON CONFLICT (calculo_id) DO UPDATE SET
    total_bruto = EXCLUDED.total_bruto, total_liquido_antes_descontos = EXCLUDED.total_liquido_antes_descontos,
    desconto_inss_reclamante = EXCLUDED.desconto_inss_reclamante, desconto_ir = EXCLUDED.desconto_ir,
    honorarios = EXCLUDED.honorarios, custas = EXCLUDED.custas, fgts_depositar = EXCLUDED.fgts_depositar,
    fgts_multa_40 = EXCLUDED.fgts_multa_40, total_reclamante = EXCLUDED.total_reclamante,
    total_reclamado = EXCLUDED.total_reclamado, resumo_verbas = EXCLUDED.resumo_verbas,
    calculado_em = now();
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_liq_insert INSTEAD OF INSERT ON pjecalc_liquidacao_resultado FOR EACH ROW EXECUTE FUNCTION pjecalc_liq_ioi();

-- INSTEAD OF for pjecalc_dados_processo
CREATE OR REPLACE FUNCTION pjecalc_dp_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  UPDATE pjecalc_calculos SET
    processo_cnj = COALESCE(NEW.numero_processo, processo_cnj),
    reclamante_nome = COALESCE(NEW.reclamante_nome, reclamante_nome),
    reclamante_cpf = COALESCE(NEW.reclamante_cpf, reclamante_cpf),
    reclamado_nome = COALESCE(NEW.reclamada_nome, reclamado_nome),
    reclamado_cnpj = COALESCE(NEW.reclamada_cnpj, reclamado_cnpj),
    vara = COALESCE(NEW.vara, vara),
    updated_at = now()
  WHERE id = v_cid;
  NEW.id := v_cid;
  RETURN NEW;
END;$$;
CREATE TRIGGER pjecalc_dp_insert INSTEAD OF INSERT ON pjecalc_dados_processo FOR EACH ROW EXECUTE FUNCTION pjecalc_dp_ioi();
CREATE TRIGGER pjecalc_dp_update INSTEAD OF UPDATE ON pjecalc_dados_processo FOR EACH ROW EXECUTE FUNCTION pjecalc_dp_ioi();
