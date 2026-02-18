-- Create table for page modules/widgets
CREATE TABLE public.page_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.modality_department_pages(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL CHECK (module_type IN ('quick_links', 'image_gallery', 'sharepoint_links', 'rich_text')),
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_modules ENABLE ROW LEVEL SECURITY;

-- Everyone can view modules
CREATE POLICY "Anyone can view page_modules"
ON public.page_modules
FOR SELECT
USING (true);

-- Only super_admins can insert
CREATE POLICY "Super admins can insert page_modules"
ON public.page_modules
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Only super_admins can update
CREATE POLICY "Super admins can update page_modules"
ON public.page_modules
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Only super_admins can delete
CREATE POLICY "Super admins can delete page_modules"
ON public.page_modules
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_page_modules_updated_at
BEFORE UPDATE ON public.page_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_page_modules_page_id ON public.page_modules(page_id);
CREATE INDEX idx_page_modules_sort_order ON public.page_modules(page_id, sort_order);