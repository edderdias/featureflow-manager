-- Certifica-se de que o bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-attachments', 'client-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Desabilita RLS temporariamente para limpar e garantir aplicação (opcional, mas seguro em migrações de correção)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Remove ABSOLUTAMENTE todas as políticas que possam estar afetando este bucket
DO $$
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON storage.objects;', ' ')
        FROM pg_policies
        WHERE tablename = 'objects' AND schemaname = 'storage'
        AND (policyname LIKE '%client_attachments%' OR policyname LIKE '%Uploads%' OR policyname LIKE '%Public%')
    );
END
$$;

-- 1. Permissão de LEITURA pública para qualquer arquivo no bucket
CREATE POLICY "all_read_client_attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'client-attachments');

-- 2. Permissão de INSERÇÃO para usuários AUTENTICADOS (Técnicos/Admins)
CREATE POLICY "auth_insert_client_attachments" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-attachments');

-- 3. Permissão de INSERÇÃO para usuários ANÔNIMOS (Clientes externos)
-- Esta é a política crítica para o formulário de ClientDemand
CREATE POLICY "anon_insert_client_attachments" ON storage.objects
FOR INSERT TO anon WITH CHECK (bucket_id = 'client-attachments');

-- 4. Permissão de ATUALIZAÇÃO para usuários AUTENTICADOS
CREATE POLICY "auth_update_client_attachments" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'client-attachments');

-- 5. Permissão de EXCLUSÃO para usuários AUTENTICADOS
CREATE POLICY "auth_delete_client_attachments" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'client-attachments');

-- Garante que RLS esteja ativado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;