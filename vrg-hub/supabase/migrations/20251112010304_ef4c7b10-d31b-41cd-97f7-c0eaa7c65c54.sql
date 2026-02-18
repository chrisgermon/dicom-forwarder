-- Create custom_pages table for HTML pages
CREATE TABLE IF NOT EXISTS public.custom_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;

-- Everyone can view published pages
CREATE POLICY "Anyone can view published pages"
  ON public.custom_pages
  FOR SELECT
  USING (is_published = true);

-- Super admins can view all pages
CREATE POLICY "Super admins can view all pages"
  ON public.custom_pages
  FOR SELECT
  USING (has_rbac_role(auth.uid(), 'super_admin'));

-- Super admins can insert pages
CREATE POLICY "Super admins can insert pages"
  ON public.custom_pages
  FOR INSERT
  WITH CHECK (has_rbac_role(auth.uid(), 'super_admin'));

-- Super admins can update pages
CREATE POLICY "Super admins can update pages"
  ON public.custom_pages
  FOR UPDATE
  USING (has_rbac_role(auth.uid(), 'super_admin'));

-- Super admins can delete pages
CREATE POLICY "Super admins can delete pages"
  ON public.custom_pages
  FOR DELETE
  USING (has_rbac_role(auth.uid(), 'super_admin'));

-- Create updated_at trigger
CREATE TRIGGER update_custom_pages_updated_at
  BEFORE UPDATE ON public.custom_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on slug for fast lookups
CREATE INDEX idx_custom_pages_slug ON public.custom_pages(slug);