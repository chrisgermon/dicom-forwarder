-- Create menu_configurations table for single-tenant application
CREATE TABLE public.menu_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  item_key TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'item',
  custom_label TEXT,
  custom_icon TEXT,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, item_key)
);

-- Create department_assignments table for newsletter assignments
CREATE TABLE public.department_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  assignee_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create saved_searches table for global search functionality
CREATE TABLE public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for menu_configurations
ALTER TABLE public.menu_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage menu configurations"
ON public.menu_configurations
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

CREATE POLICY "Users can read menu configurations"
ON public.menu_configurations
FOR SELECT
USING (true);

-- Add RLS policies for department_assignments
ALTER TABLE public.department_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage department assignments"
ON public.department_assignments
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

CREATE POLICY "Users can read department assignments"
ON public.department_assignments
FOR SELECT
USING (true);

-- Add RLS policies for saved_searches
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved searches"
ON public.saved_searches
FOR ALL
USING (auth.uid() = user_id);

-- Update beta_feedback table to include missing columns
ALTER TABLE public.beta_feedback ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.beta_feedback ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.beta_feedback ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.beta_feedback ADD COLUMN IF NOT EXISTS browser_info TEXT;