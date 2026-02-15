
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role app_role;
  user_provided_role text;
BEGIN
  user_provided_role := NEW.raw_user_meta_data->>'role';
  
  -- Only allow non-admin roles from signup; default to 'farmer'
  IF user_provided_role IN ('farmer', 'distributor', 'expert') THEN
    selected_role := user_provided_role::app_role;
  ELSE
    selected_role := 'farmer';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, selected_role);
  RETURN NEW;
END;
$$;
