
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted'; END;
$$;
