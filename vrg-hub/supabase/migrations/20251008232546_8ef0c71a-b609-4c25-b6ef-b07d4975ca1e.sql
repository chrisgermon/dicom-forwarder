-- Create newsletter_templates table for managing department submission templates
CREATE TABLE IF NOT EXISTS public.newsletter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {key: string, label: string, required: boolean, max_chars: number}
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(department)
);

-- Enable RLS
ALTER TABLE public.newsletter_templates ENABLE ROW LEVEL SECURITY;

-- Policies for newsletter_templates
CREATE POLICY "Users can view active templates"
ON public.newsletter_templates
FOR SELECT
USING (is_active = true);

CREATE POLICY "Managers can manage templates"
ON public.newsletter_templates
FOR ALL
USING (
  has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
  has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

-- Create updated_at trigger
CREATE TRIGGER update_newsletter_templates_updated_at
  BEFORE UPDATE ON public.newsletter_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default IT template
INSERT INTO public.newsletter_templates (department, display_name, description, sections)
VALUES (
  'IT',
  'IT – Newsletter Submission',
  'Add your monthly updates. Sections marked with * are required unless you mark no update.',
  '[
    {"key": "system_performance", "label": "System performance", "required": true, "max_chars": 1500},
    {"key": "upgrades_implementations", "label": "Upgrades / new implementations", "required": true, "max_chars": 1500},
    {"key": "upcoming_changes", "label": "Upcoming changes", "required": false, "max_chars": 1500},
    {"key": "training_resources", "label": "Training & resources", "required": false, "max_chars": 1500}
  ]'::jsonb
)
ON CONFLICT (department) DO NOTHING;