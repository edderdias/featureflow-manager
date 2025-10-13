-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN role TEXT DEFAULT 'user' NOT NULL;

-- Update RLS policies for profiles to allow admins to manage other profiles
-- Existing policies already allow users to manage their own profile.
-- We need to add policies for admins to SELECT, INSERT, UPDATE, DELETE other profiles.

-- Policy for admins to SELECT all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Policy for admins to INSERT new profiles (e.g., when inviting a user)
CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Policy for admins to UPDATE other profiles (e.g., changing roles)
CREATE POLICY "Admins can update other profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Policy for admins to DELETE other profiles
CREATE POLICY "Admins can delete other profiles" ON public.profiles
FOR DELETE TO authenticated
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Ensure existing policies for self-management are still valid and don't conflict
-- (The existing policies are fine as they use `auth.uid() = id`)