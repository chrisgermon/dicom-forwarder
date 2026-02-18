-- Create knowledge_base_categories table
CREATE TABLE public.knowledge_base_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge_base_pages table
CREATE TABLE public.knowledge_base_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  category_id UUID REFERENCES public.knowledge_base_categories(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.knowledge_base_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_pages ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Knowledge base categories are viewable by everyone"
  ON public.knowledge_base_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Knowledge base pages are viewable by everyone"
  ON public.knowledge_base_pages
  FOR SELECT
  USING (true);

-- Create policies for authenticated users to manage (you can restrict this to admin only later)
CREATE POLICY "Authenticated users can insert categories"
  ON public.knowledge_base_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON public.knowledge_base_categories
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete categories"
  ON public.knowledge_base_categories
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pages"
  ON public.knowledge_base_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pages"
  ON public.knowledge_base_pages
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete pages"
  ON public.knowledge_base_pages
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_knowledge_base_categories_updated_at
  BEFORE UPDATE ON public.knowledge_base_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_base_pages_updated_at
  BEFORE UPDATE ON public.knowledge_base_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();