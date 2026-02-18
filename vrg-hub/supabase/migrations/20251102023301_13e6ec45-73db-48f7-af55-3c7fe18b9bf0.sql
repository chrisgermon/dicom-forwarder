-- Create table for department section templates
CREATE TABLE IF NOT EXISTS public.department_section_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_name TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_department_name UNIQUE (department_name)
);

-- Add RLS policies
ALTER TABLE public.department_section_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage department templates"
ON public.department_section_templates
FOR ALL
USING (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Everyone can view active department templates"
ON public.department_section_templates
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_department_section_templates_updated_at
  BEFORE UPDATE ON public.department_section_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial department templates
INSERT INTO public.department_section_templates (department_name, sections, sort_order) VALUES
('IT', '[
  {"name": "System performance", "key": "system_performance", "isRequired": true},
  {"name": "Upgrades / new implementations", "key": "upgrades_implementations", "isRequired": true},
  {"name": "Upcoming changes", "key": "upcoming_changes", "isRequired": false},
  {"name": "Training & resources", "key": "training_resources", "isRequired": false}
]'::jsonb, 1),
('Admin Managers', '[
  {"name": "Administration updates & highlights", "key": "admin_updates", "isRequired": false},
  {"name": "Management initiatives & projects", "key": "management_initiatives", "isRequired": false},
  {"name": "Process improvements & efficiencies", "key": "process_improvements", "isRequired": false},
  {"name": "Upcoming changes & announcements", "key": "upcoming_changes", "isRequired": false}
]'::jsonb, 2),
('CMO', '[
  {"name": "Clinical updates & initiatives", "key": "clinical_updates", "isRequired": true},
  {"name": "Quality & safety highlights", "key": "quality_safety", "isRequired": true},
  {"name": "Training & development", "key": "training_development", "isRequired": false},
  {"name": "Upcoming changes", "key": "upcoming_changes", "isRequired": false}
]'::jsonb, 3),
('Commercial/Marketing', '[
  {"name": "Marketing campaigns & activity", "key": "marketing_campaigns", "isRequired": true},
  {"name": "Market insights & trends", "key": "market_insights", "isRequired": true},
  {"name": "Upcoming initiatives", "key": "upcoming_initiatives", "isRequired": false},
  {"name": "Partnership updates", "key": "partnership_updates", "isRequired": false}
]'::jsonb, 4),
('Finance', '[
  {"name": "Financial summary & highlights", "key": "financial_summary", "isRequired": true},
  {"name": "Budget updates & variances", "key": "budget_updates", "isRequired": true},
  {"name": "Upcoming changes & initiatives", "key": "upcoming_changes", "isRequired": false},
  {"name": "Cost savings & efficiencies", "key": "cost_savings", "isRequired": false}
]'::jsonb, 5),
('HR / People & Culture / OHS', '[
  {"name": "People updates & announcements", "key": "people_updates", "isRequired": true},
  {"name": "OHS & safety updates", "key": "ohs_safety", "isRequired": true},
  {"name": "Training programs & initiatives", "key": "training_programs", "isRequired": false},
  {"name": "Policy changes & reminders", "key": "policy_changes", "isRequired": false}
]'::jsonb, 6),
('Operations Managers', '[
  {"name": "Operational highlights & achievements", "key": "operational_highlights", "isRequired": true},
  {"name": "Performance metrics & KPIs", "key": "performance_metrics", "isRequired": true},
  {"name": "Process improvements", "key": "process_improvements", "isRequired": false},
  {"name": "Upcoming changes & initiatives", "key": "upcoming_changes", "isRequired": false}
]'::jsonb, 7),
('Technical Partners', '[
  {"name": "Partnership updates & highlights", "key": "partnership_updates", "isRequired": true},
  {"name": "Technical developments", "key": "technical_developments", "isRequired": true},
  {"name": "Integration updates", "key": "integration_updates", "isRequired": false},
  {"name": "Upcoming changes", "key": "upcoming_changes", "isRequired": false}
]'::jsonb, 8),
('Workflow Manager', '[
  {"name": "Workflow improvements & optimizations", "key": "workflow_improvements", "isRequired": true},
  {"name": "Efficiency metrics & performance", "key": "efficiency_metrics", "isRequired": true},
  {"name": "Process changes", "key": "process_changes", "isRequired": false},
  {"name": "Upcoming initiatives", "key": "upcoming_initiatives", "isRequired": false}
]'::jsonb, 9)
ON CONFLICT (department_name) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.department_section_templates IS 'Configurable templates for newsletter department sections';
COMMENT ON COLUMN public.department_section_templates.sections IS 'Array of {name: string, key: string, isRequired: boolean} objects';