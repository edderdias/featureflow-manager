-- Redefine the is_admin function to explicitly set role to postgres, ensuring RLS bypass
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_admin_result boolean;
BEGIN
  -- Temporarily set role to postgres to bypass RLS for this query
  PERFORM set_config('role', 'postgres', true);
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin') INTO is_admin_result;
  -- Reset role to the original user
  PERFORM set_config('role', current_user, true);
  RETURN is_admin_result;
END;
$$;