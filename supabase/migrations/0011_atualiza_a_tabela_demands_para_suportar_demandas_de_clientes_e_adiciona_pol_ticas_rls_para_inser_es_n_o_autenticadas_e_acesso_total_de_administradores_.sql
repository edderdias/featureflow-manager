-- Altera a tabela demands para tornar user_id anulável e adicionar campos de cliente
ALTER TABLE public.demands
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.demands
ADD COLUMN client_cnpj TEXT,
ADD COLUMN client_email TEXT,
ADD COLUMN client_name TEXT;

-- Adiciona política RLS para permitir que usuários não autenticados insiram demandas de clientes
CREATE POLICY "Allow unauthenticated client demand inserts" ON public.demands
FOR INSERT TO anon
WITH CHECK (
    user_id IS NULL AND
    client_email IS NOT NULL AND
    client_cnpj IS NOT NULL AND
    title IS NOT NULL AND
    type IS NOT NULL AND
    priority IS NOT NULL AND
    status IS NOT NULL AND
    system IS NOT NULL AND
    responsible IS NOT NULL
);

-- Adiciona política RLS para permitir que administradores visualizem todas as demandas
CREATE POLICY "Admins can view all demands" ON public.demands
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
    )
);

-- Atualiza as políticas existentes para garantir que ainda funcionem com user_id anulável
-- Usuários podem ver apenas suas próprias demandas (se autenticados)
DROP POLICY IF EXISTS "Users can only see their own demands" ON public.demands;
CREATE POLICY "Users can only see their own demands" ON public.demands
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Usuários podem criar suas próprias demandas (se autenticados)
DROP POLICY IF EXISTS "Users can create their own demands" ON public.demands;
CREATE POLICY "Users can create their own demands" ON public.demands
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias demandas (se autenticados)
DROP POLICY IF EXISTS "Users can update their own demands" ON public.demands;
CREATE POLICY "Users can update their own demands" ON public.demands
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Usuários podem excluir suas próprias demandas (se autenticados)
DROP POLICY IF EXISTS "Users can delete their own demands" ON public.demands;
CREATE POLICY "Users can delete their own demands" ON public.demands
FOR DELETE TO authenticated
USING (auth.uid() = user_id);