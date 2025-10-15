-- Drop all existing policies on public.profiles to prevent conflicts and recursion issues
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Recreate the is_admin function to ensure it's correctly defined as SECURITY DEFINER
-- This function checks if the current user is an admin without triggering RLS on profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Recreate RLS policies for public.profiles using the is_admin() function
-- This allows users to manage their own profiles AND admins to manage any profile
CREATE POLICY "Allow authenticated users to view their own profile or if admin" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Allow authenticated users to insert their own profile or if admin" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Allow authenticated users to update their own profile or if admin" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Allow authenticated users to delete their own profile or if admin" ON public.profiles
FOR DELETE TO authenticated USING (auth.uid() = id OR public.is_admin());