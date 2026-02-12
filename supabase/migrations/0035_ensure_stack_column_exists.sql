-- Garante que a coluna stack exista na tabela demands
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='demands' AND column_name='stack') THEN
        ALTER TABLE public.demands ADD COLUMN stack TEXT DEFAULT 'none';
    END IF;
END $$;

-- Atualiza o cache do PostgREST (isso acontece automaticamente no Supabase, mas garantimos a estrutura)
NOTIFY pgrst, 'reload schema';