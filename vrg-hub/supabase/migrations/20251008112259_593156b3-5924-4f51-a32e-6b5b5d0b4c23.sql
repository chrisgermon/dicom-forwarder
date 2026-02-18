-- Add assigned_to field to department_requests
ALTER TABLE public.department_requests
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id);

-- Create index for assignment queries
CREATE INDEX IF NOT EXISTS idx_department_requests_assigned_to 
ON public.department_requests(assigned_to);

-- Create department_assignment_rules table for future role-based assignment
CREATE TABLE IF NOT EXISTS public.department_assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department text NOT NULL,
  sub_department text,
  assigned_role text,
  assigned_user_id uuid REFERENCES auth.users(id),
  priority integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on assignment rules
ALTER TABLE public.department_assignment_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment rules
CREATE POLICY "Admins can manage assignment rules"
ON public.department_assignment_rules
FOR ALL
USING (
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role) 
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "Users can view their company assignment rules"
ON public.department_assignment_rules
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

-- Create index for assignment rule lookups
CREATE INDEX IF NOT EXISTS idx_department_assignment_rules_lookup
ON public.department_assignment_rules(company_id, department, sub_department, is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_department_assignment_rules_updated_at
  BEFORE UPDATE ON public.department_assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();