
CREATE OR REPLACE FUNCTION public.pjecalc_get_calculo_id(p_case_id uuid, p_user_id uuid DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id UUID; v_uid UUID;
BEGIN
  SELECT id INTO v_id FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  IF v_id IS NULL THEN
    v_uid := COALESCE(p_user_id, auth.uid());
    IF v_uid IS NULL THEN
      -- Fallback: get user from the case's criado_por
      SELECT criado_por INTO v_uid FROM cases WHERE id = p_case_id;
    END IF;
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Cannot determine user_id for pjecalc_calculos';
    END IF;
    INSERT INTO pjecalc_calculos (case_id, user_id) VALUES (p_case_id, v_uid) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;$function$;
