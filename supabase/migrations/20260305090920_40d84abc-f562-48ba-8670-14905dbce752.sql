-- Drop the old single-parameter version that conflicts with the 2-param version
DROP FUNCTION IF EXISTS public.pjecalc_get_calculo_id(uuid);
