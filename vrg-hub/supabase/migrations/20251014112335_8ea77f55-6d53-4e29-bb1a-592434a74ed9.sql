-- Create form_templates table
CREATE TABLE IF NOT EXISTS public.form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  form_type TEXT NOT NULL,
  department TEXT,
  sub_department TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read active form templates"
ON public.form_templates
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage form templates"
ON public.form_templates
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'tenant_admin'::app_role)
);

-- Add updated_at trigger
CREATE TRIGGER update_form_templates_updated_at
BEFORE UPDATE ON public.form_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();