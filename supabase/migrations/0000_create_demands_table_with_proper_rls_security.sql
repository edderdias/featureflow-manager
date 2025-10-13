-- Create demands table
CREATE TABLE public.demands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  system TEXT NOT NULL,
  responsible TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  story_points INTEGER,
  sprint TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}'::TEXT[]
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "Users can view their own demands" ON public.demands
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own demands" ON public.demands
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own demands" ON public.demands
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own demands" ON public.demands
FOR DELETE TO authenticated USING (auth.uid() = user_id);