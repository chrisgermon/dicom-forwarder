-- Create form templates table to store custom form definitions
CREATE TABLE public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  form_type TEXT NOT NULL, -- 'hardware', 'marketing', 'toner', 'department', etc.
  department TEXT, -- For department-specific forms
  sub_department TEXT, -- For sub-department-specific forms
  fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of field definitions
  settings JSONB DEFAULT '{}'::jsonb, -- Form-level settings (notifications, etc.)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, form_type, department, sub_department)
);

-- Enable RLS
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their company's form templates
CREATE POLICY "Users can view their company form templates"
ON public.form_templates
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

-- Tenant admins can manage their company form templates
CREATE POLICY "Tenant admins can manage their company form templates"
ON public.form_templates
FOR ALL
USING (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
)
WITH CHECK (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
);

-- Super admins can manage all form templates
CREATE POLICY "Super admins can manage all form templates"
ON public.form_templates
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Create trigger to update updated_at
CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_form_templates_company_type ON public.form_templates(company_id, form_type);
CREATE INDEX idx_form_templates_department ON public.form_templates(company_id, department, sub_department);