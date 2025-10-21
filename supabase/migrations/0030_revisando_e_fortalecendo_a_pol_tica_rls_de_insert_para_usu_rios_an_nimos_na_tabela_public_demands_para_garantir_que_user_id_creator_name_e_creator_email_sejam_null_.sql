-- Desabilitar RLS temporariamente para remover políticas antigas
ALTER TABLE public.demands DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Allow users to view their own demands, and technicians/admins to view all demands" ON public.demands;
DROP POLICY IF EXISTS "Allow authenticated users to insert demands based on role" ON public.demands;
DROP POLICY IF EXISTS "Allow anonymous clients to insert client demands" ON public.demands;
DROP POLICY IF EXISTS "Allow users to update their own demands, and technicians/admins to update any demand" ON public.demands;
DROP POLICY IF EXISTS "Allow admins to delete demands" ON public.demands;

-- Reabilitar RLS
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT: Usuários podem ver suas próprias demandas. Técnicos e administradores podem ver todas as demandas.
CREATE POLICY "Allow users to view their own demands, and technicians/admins to view all demands"
ON public.demands FOR SELECT TO authenticated
USING (
  (auth.uid() = user_id) OR is_admin() OR is_technician()
);

-- Policy para INSERT (Authenticated): Usuários podem inserir suas próprias demandas. Técnicos e administradores podem inserir qualquer demanda.
CREATE POLICY "Allow authenticated users to insert demands based on role"
ON public.demands FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id) OR is_admin() OR is_technician()
);

-- Policy para INSERT (Anonymous): Clientes anônimos podem inserir demandas (client_demand).
-- Adicionando checks explícitos para creator_name e creator_email serem NULL.
CREATE POLICY "Allow anonymous clients to insert client demands"
ON public.demands FOR INSERT TO anon
WITH CHECK (
  user_id IS NULL AND client_email IS NOT NULL AND creator_name IS NULL AND creator_email IS NULL
);

-- Policy para UPDATE: Usuários podem atualizar suas próprias demandas. Técnicos e administradores podem atualizar qualquer demanda.
CREATE POLICY "Allow users to update their own demands, and technicians/admins to update any demand"
ON public.demands FOR UPDATE TO authenticated
USING (
  (auth.uid() = user_id) OR is_admin() OR is_technician()
)
WITH CHECK (
  (auth.uid() = user_id) OR is_admin() OR is_technician()
);

-- Policy para DELETE: Apenas administradores podem excluir demandas.
CREATE POLICY "Allow admins to delete demands"
ON public.demands FOR DELETE TO authenticated
USING (
  is_admin()
);