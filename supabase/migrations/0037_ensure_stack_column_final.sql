-- Adiciona a coluna stack se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demands' AND column_name='stack') THEN
        ALTER TABLE public.demands ADD COLUMN stack TEXT DEFAULT 'none';
    END IF;
END $$;

-- Força o valor padrão para evitar nulos
UPDATE public.demands SET stack = 'none' WHERE stack IS NULL;

-- Notifica o sistema para recarregar o esquema
NOTIFY pgrst, 'reload schema';