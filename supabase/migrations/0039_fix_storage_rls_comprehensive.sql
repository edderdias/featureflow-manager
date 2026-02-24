-- Garante que o bucket exista e seja público
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-attachments', 'client-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Anonymous Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Deletes" ON storage.objects;
DROP POLICY IF EXISTS "client_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "client_attachments_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "client_attachments_insert_anon" ON storage.objects;
DROP POLICY IF EXISTS "client_attachments_update_auth" ON storage.objects;
DROP POLICY IF EXISTS "client_attachments_delete_auth" ON storage.objects;

-- 1. Permite que qualquer pessoa (público) visualize os arquivos
CREATE POLICY "client_attachments_select" ON storage.objects
FOR SELECT USING (bucket_id = 'client-attachments');

-- 2. Permite que usuários autenticados (técnicos/admins) façam upload
CREATE POLICY "client_attachments_insert_auth" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-attachments');

-- 3. Permite que usuários anônimos (clientes no formulário externo) façam upload
CREATE POLICY "client_attachments_insert_anon" ON storage.objects
FOR INSERT TO anon WITH CHECK (bucket_id = 'client-attachments');

-- 4. Permite que usuários autenticados atualizem arquivos
CREATE POLICY "client_attachments_update_auth" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'client-attachments');

-- 5. Permite que usuários autenticados excluam arquivos
CREATE POLICY "client_attachments_delete_auth" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'client-attachments');