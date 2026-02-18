-- Create quick_links table for user customizable links
CREATE TABLE IF NOT EXISTS public.quick_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own quick links
CREATE POLICY "Users can view their own quick links"
  ON public.quick_links
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own quick links
CREATE POLICY "Users can insert their own quick links"
  ON public.quick_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own quick links
CREATE POLICY "Users can update their own quick links"
  ON public.quick_links
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own quick links
CREATE POLICY "Users can delete their own quick links"
  ON public.quick_links
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_quick_links_updated_at
  BEFORE UPDATE ON public.quick_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();