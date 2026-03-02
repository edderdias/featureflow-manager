-- 1. Garantir que o bucket de anexos existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-attachments', 'client-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpar políticas antigas de storage para evitar conflitos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Give public access to client-attachments 1" ON storage.objects;
DROP POLICY IF EXISTS "Give public access to client-attachments 2" ON storage.objects;

-- 3. Criar novas políticas de storage permissivas para o bucket específico
CREATE POLICY "Permitir acesso de leitura para todos"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-attachments');

CREATE POLICY "Permitir upload para todos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-attachments');

CREATE POLICY "Permitir atualização para todos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-attachments');

-- 4. Corrigir políticas da tabela de demandas
-- Clientes precisam conseguir enviar nome e email mesmo não estando logados
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.demands;
DROP POLICY IF EXISTS "Allow unauthenticated client demand inserts" ON public.demands;

CREATE POLICY "Permitir inserção de demandas por clientes"
ON public.demands FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Garantir que todos os usuários autenticados possam ver as demandas
DROP POLICY IF EXISTS "Allow authenticated users to view all demands" ON public.demands;
CREATE POLICY "Permitir visualização de demandas para usuários logados"
ON public.demands FOR SELECT
TO authenticated
USING (true);