-- 1. Revoke existing INSERT permission from 'anon' to ensure a clean slate
REVOKE INSERT ON public.demands FROM anon;

-- 2. Grant INSERT permission to the 'anon' role on the 'demands' table
-- This is the base permission required for the API to allow the insert request.
GRANT INSERT ON public.demands TO anon;

-- 3. Drop the existing policy to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous users to insert client demands" ON public.demands;

-- 4. Recreate the RLS policy for anonymous users to insert client demands (where user_id is NULL)
CREATE POLICY "Allow anonymous users to insert client demands"
ON public.demands FOR INSERT TO anon
WITH CHECK (user_id IS NULL);