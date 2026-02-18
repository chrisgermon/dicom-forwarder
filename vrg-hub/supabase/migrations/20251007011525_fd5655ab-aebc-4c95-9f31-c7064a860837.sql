-- Rename workspaces to categories
ALTER TABLE public.knowledge_base_workspaces RENAME TO knowledge_base_categories;

-- Add subcategory support
CREATE TABLE IF NOT EXISTS public.knowledge_base_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.knowledge_base_categories(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- Update pages table to use new structure
ALTER TABLE public.knowledge_base_pages RENAME COLUMN workspace_id TO category_id;
ALTER TABLE public.knowledge_base_pages ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.knowledge_base_subcategories(id) ON DELETE CASCADE;

-- Add template metadata
ALTER TABLE public.knowledge_base_pages ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE public.knowledge_base_pages ADD COLUMN IF NOT EXISTS template_description TEXT;
ALTER TABLE public.knowledge_base_pages ADD COLUMN IF NOT EXISTS template_preview_image TEXT;

-- Create index for subcategories
CREATE INDEX IF NOT EXISTS idx_kb_subcategories_category ON public.knowledge_base_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_pages_subcategory ON public.knowledge_base_pages(subcategory_id);

-- Enable RLS for subcategories
ALTER TABLE public.knowledge_base_subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subcategories
CREATE POLICY "Users can view their company subcategories"
  ON public.knowledge_base_subcategories FOR SELECT
  USING (company_id = get_user_company(auth.uid()) AND is_archived = false);

CREATE POLICY "Users can create subcategories"
  ON public.knowledge_base_subcategories FOR INSERT
  WITH CHECK (
    company_id = get_user_company(auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can update subcategories"
  ON public.knowledge_base_subcategories FOR UPDATE
  USING (
    (created_by = auth.uid() OR 
    has_role(auth.uid(), company_id, 'manager'::user_role) OR
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role))
    AND company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Admins can delete subcategories"
  ON public.knowledge_base_subcategories FOR DELETE
  USING (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- Add trigger for subcategories
CREATE TRIGGER update_kb_subcategories_updated_at
  BEFORE UPDATE ON public.knowledge_base_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();