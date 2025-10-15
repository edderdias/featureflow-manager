CREATE POLICY "Allow authenticated users to view all demands" ON public.demands
FOR SELECT TO authenticated USING (true);