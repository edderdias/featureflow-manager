-- Adiciona a coluna is_dev à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_dev BOOLEAN DEFAULT false;

-- Atualiza a função handle_new_user para incluir is_dev se vier nos metadados (opcional)
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