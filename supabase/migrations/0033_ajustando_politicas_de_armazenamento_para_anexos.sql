-- Garante que o bucket 'client-attachments' seja público
UPDATE storage.buckets SET public = true WHERE id = 'client-attachments';

-- Remove políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- Política para permitir que QUALQUER PESSOA (anônimo ou autenticado) faça upload
-- Isso é necessário para a página de ClientDemand (anônimo) e DemandDialog (autenticado)
CREATE POLICY "Allow all uploads to client-attachments"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'client-attachments');

-- Política para permitir leitura pública de todos os arquivos no bucket
CREATE POLICY "Allow public read access to client-attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-attachments');

-- Política para permitir que usuários excluam seus próprios uploads (opcional, mas recomendado)
CREATE POLICY "Allow all deletes from client-attachments"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'client-attachments');