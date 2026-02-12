-- Força a criação da coluna stack se ela não existir
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS stack TEXT DEFAULT 'none';

-- Garante que a coluna tenha um valor padrão para registros existentes
UPDATE public.demands SET stack = 'none' WHERE stack IS NULL;

-- Notifica o PostgREST para recarregar o esquema imediatamente
NOTIFY pgrst, 'reload schema';