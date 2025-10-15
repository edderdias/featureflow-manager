-- Cria um novo bucket de armazenamento para anexos de clientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-attachments', 'client-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Configura políticas RLS para o bucket 'client-attachments'
-- Permite que usuários não autenticados façam upload de arquivos
CREATE POLICY "Allow anon upload" ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'client-attachments');

-- Permite que usuários não autenticados visualizem arquivos
CREATE POLICY "Allow anon read" ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'client-attachments');

-- Permite que usuários autenticados visualizem arquivos (opcional, mas bom para consistência)
CREATE POLICY "Allow authenticated read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'client-attachments');