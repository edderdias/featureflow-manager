-- Drop the problematic admin SELECT policy to avoid infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;