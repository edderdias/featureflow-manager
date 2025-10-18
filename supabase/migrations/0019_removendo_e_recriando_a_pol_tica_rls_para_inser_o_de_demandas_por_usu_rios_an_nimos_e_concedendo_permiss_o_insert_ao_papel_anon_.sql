-- 1. Drop the existing policy to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous users to insert client demands" ON public.demands;

-- 2. Grant INSERT permission to the 'anon' role on the 'demands' table
-- This ensures the 'anon' role has the base permission to insert, which RLS policies then filter.
GRANT INSERT ON public.demands TO anon;

-- 3. Recreate the RLS policy for anonymous users to insert client demands (where user_id is NULL)
CREATE POLICY "Allow anonymous users to insert client demands"
ON public.demands FOR INSERT TO anon
WITH CHECK (user_id IS NULL);