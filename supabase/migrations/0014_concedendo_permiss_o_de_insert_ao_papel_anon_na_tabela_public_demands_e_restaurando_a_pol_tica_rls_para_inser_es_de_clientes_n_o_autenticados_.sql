-- 1. Conceder permissão de INSERT ao papel 'anon' na tabela public.demands
GRANT INSERT ON public.demands TO anon;

-- 2. Restaurar a política RLS "Allow unauthenticated client demand inserts" para sua versão original e mais segura
DROP POLICY IF EXISTS "Allow unauthenticated client demand inserts" ON public.demands;
CREATE POLICY "Allow unauthenticated client demand inserts" ON public.demands
FOR INSERT TO anon
WITH CHECK (
    user_id IS NULL AND
    client_cnpj IS NOT NULL AND
    client_email IS NOT NULL AND
    client_name IS NOT NULL AND
    title IS NOT NULL AND
    description IS NOT NULL AND
    type IS NOT NULL AND
    priority IS NOT NULL AND
    status IS NOT NULL AND
    system IS NOT NULL AND
    responsible IS NOT NULL
);