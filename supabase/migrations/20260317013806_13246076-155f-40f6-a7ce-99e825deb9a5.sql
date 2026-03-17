
-- Create words table for vocabulary storage
CREATE TABLE public.words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  definition TEXT,
  part_of_speech TEXT,
  etymology TEXT,
  sentiment TEXT DEFAULT 'neutral',
  frequency INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

-- Public read/write for now (no auth yet)
CREATE POLICY "Words are publicly readable" ON public.words FOR SELECT USING (true);
CREATE POLICY "Anyone can insert words" ON public.words FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete words" ON public.words FOR DELETE USING (true);
