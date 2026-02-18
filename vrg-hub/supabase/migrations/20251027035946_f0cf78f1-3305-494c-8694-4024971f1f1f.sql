-- Create storage bucket for knowledge base videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kb-videos', 'kb-videos', true);

-- Create kb_videos table
CREATE TABLE IF NOT EXISTS public.kb_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  category_id UUID REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  views INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on kb_videos
ALTER TABLE public.kb_videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for kb_videos
CREATE POLICY "Anyone can view published videos"
  ON public.kb_videos FOR SELECT
  USING (is_published = true);

CREATE POLICY "Authenticated users can upload videos"
  ON public.kb_videos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own videos"
  ON public.kb_videos FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own videos"
  ON public.kb_videos FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Create storage policies for kb-videos bucket
CREATE POLICY "Anyone can view videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kb-videos');

CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'kb-videos');

CREATE POLICY "Users can update their own videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'kb-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'kb-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_kb_videos_category ON public.kb_videos(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_videos_published ON public.kb_videos(is_published);

-- Create trigger for updated_at
CREATE TRIGGER update_kb_videos_updated_at
  BEFORE UPDATE ON public.kb_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();