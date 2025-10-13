-- Remover políticas existentes na tabela public.profiles para evitar conflitos e recursão
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete other profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recriar políticas para public.profiles

-- 1. Permitir que usuários autenticados visualizem seu próprio perfil
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

-- 2. Permitir que usuários autenticados insiram seu próprio perfil (usado pelo trigger handle_new_user)
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. Permitir que usuários autenticados atualizem seu próprio perfil
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- 4. Permitir que usuários autenticados excluam seu próprio perfil
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE TO authenticated
USING (auth.uid() = id);

-- Políticas para administradores (usando EXISTS para verificar o papel e evitar recursão)

-- 5. Administradores podem visualizar todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Administradores podem inserir qualquer perfil
CREATE POLICY "Admins can insert any profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7. Administradores podem atualizar qualquer perfil
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 8. Administradores podem excluir qualquer perfil
CREATE POLICY "Admins can delete any profile"
ON public.profiles FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));