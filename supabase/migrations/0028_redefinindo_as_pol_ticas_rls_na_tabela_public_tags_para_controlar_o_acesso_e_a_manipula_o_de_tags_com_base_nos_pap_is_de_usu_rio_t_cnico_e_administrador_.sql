-- Desabilitar RLS temporariamente para remover políticas antigas
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Users can view their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can create their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;

-- Reabilitar RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT: Usuários, técnicos e administradores podem ver suas próprias tags. Administradores podem ver todas as tags.
CREATE POLICY "Allow users to view their own tags, and admins to view all tags"
ON public.tags FOR SELECT TO authenticated
USING (
  (auth.uid() = user_id) OR is_admin()
);

-- Policy para INSERT: Usuários, técnicos e administradores podem criar suas próprias tags. Administradores podem criar qualquer tag.
CREATE POLICY "Allow users to create their own tags, and admins to create any tag"
ON public.tags FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id) OR is_admin()
);

-- Policy para UPDATE: Usuários, técnicos e administradores podem atualizar suas próprias tags. Administradores podem atualizar qualquer tag.
CREATE POLICY "Allow users to update their own tags, and admins to update any tag"
ON public.tags FOR UPDATE TO authenticated
USING (
  (auth.uid() = user_id) OR is_admin()
)
WITH CHECK (
  (auth.uid() = user_id) OR is_admin()
);

-- Policy para DELETE: Usuários, técnicos e administradores podem excluir suas próprias tags. Administradores podem excluir qualquer tag.
CREATE POLICY "Allow users to delete their own tags, and admins to delete any tag"
ON public.tags FOR DELETE TO authenticated
USING (
  (auth.uid() = user_id) OR is_admin()
);