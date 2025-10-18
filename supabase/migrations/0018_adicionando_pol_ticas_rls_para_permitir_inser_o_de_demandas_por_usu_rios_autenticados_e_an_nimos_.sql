-- Policy for authenticated users to insert their own demands
CREATE POLICY "Allow authenticated users to insert their own demands"
ON public.demands FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for anonymous users to insert client demands (where user_id is NULL)
CREATE POLICY "Allow anonymous users to insert client demands"
ON public.demands FOR INSERT TO anon
WITH CHECK (user_id IS NULL);