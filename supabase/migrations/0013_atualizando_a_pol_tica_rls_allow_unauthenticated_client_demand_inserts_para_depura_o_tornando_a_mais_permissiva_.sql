-- Atualiza a política RLS para permitir que usuários não autenticados insiram demandas de clientes
-- Temporariamente, remove as verificações de NOT NULL para depuração
DROP POLICY IF EXISTS "Allow unauthenticated client demand inserts" ON public.demands;
CREATE POLICY "Allow unauthenticated client demand inserts" ON public.demands
FOR INSERT TO anon
WITH CHECK (
    user_id IS NULL
);