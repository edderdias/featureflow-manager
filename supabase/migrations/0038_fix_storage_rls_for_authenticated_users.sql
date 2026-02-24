-- Garante que o bucket existe (caso não tenha sido criado corretamente antes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-attachments', 'client-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "All users can upload" ON storage.objects;

-- 1. Permitir que usuários autenticados façam upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-attachments');

-- 2. Permitir que usuários anônimos façam upload (necessário para a página ClientDemand)
CREATE POLICY "Allow anonymous uploads"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'client-attachments');

-- 3. Permitir que qualquer pessoa (público) visualize os arquivos
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-attachments');

-- 4. Permitir que usuários autenticados excluam seus próprios uploads (opcional, mas recomendado)
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-attachments');