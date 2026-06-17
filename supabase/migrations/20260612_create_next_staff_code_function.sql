-- Migration: create next_staff_code function to generate unique staff_code safely
-- Uses pg_advisory_xact_lock on hashtext(prefix) to avoid races across concurrent transactions

CREATE OR REPLACE FUNCTION public.next_staff_code(p_prefix text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  maxn int := 0;
  v_found text;
BEGIN
  -- acquire advisory lock scoped to this transaction using a hash of the prefix
  PERFORM pg_advisory_xact_lock(hashtext(p_prefix)::bigint);

  SELECT COALESCE(MAX((regexp_matches(staff_code, '^' || p_prefix || '-(\\d+)$'))[1]::int), 0)
    INTO maxn
    FROM public.users
    WHERE staff_code ~ ('^' || p_prefix || '-\\d+$');

  RETURN p_prefix || '-' || lpad((maxn + 1)::text, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.next_staff_code(text) IS 'Return next staff_code like ST-0001 for given prefix, using advisory lock to avoid race conditions.';
