-- Atualiza a função que lida com novos usuários para incluir o campo is_dev
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, is_dev)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    COALESCE((new.raw_user_meta_data ->> 'is_dev')::boolean, false)
  );
  RETURN new;
END;
$$;

-- Garante que a coluna is_dev existe na tabela profiles (caso não tenha sido criada corretamente antes)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_dev') THEN
    ALTER TABLE public.profiles ADD COLUMN is_dev BOOLEAN DEFAULT false;
  END IF;
END $$;