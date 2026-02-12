-- Adiciona a coluna stack à tabela demands
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS stack TEXT DEFAULT 'none';

-- Garante que o bucket exista e seja público
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-attachments', 'client-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Allow all uploads to client-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to client-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes from client-attachments" ON storage.objects;

-- Política de Inserção (Upload) - Permite para todos (anon e auth)
CREATE POLICY "Allow all uploads to client-attachments"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'client-attachments');

-- Política de Seleção (Leitura) - Permite para todos
CREATE POLICY "Allow public read access to client-attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-attachments');

-- Política de Atualização - Permite para todos
CREATE POLICY "Allow all updates to client-attachments"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'client-attachments');

-- Política de Exclusão - Permite para todos
CREATE POLICY "Allow all deletes from client-attachments"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'client-attachments');