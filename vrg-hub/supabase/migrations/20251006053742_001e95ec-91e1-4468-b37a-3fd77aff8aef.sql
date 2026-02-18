-- Create table for department managers
CREATE TABLE IF NOT EXISTS public.helpdesk_department_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  department_id UUID NOT NULL REFERENCES public.helpdesk_departments(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, department_id)
);

-- Enable RLS
ALTER TABLE public.helpdesk_department_managers ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user can access a department
CREATE OR REPLACE FUNCTION public.can_access_helpdesk_department(_user_id uuid, _department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Super admins can access all departments
  SELECT CASE
    WHEN has_global_role(_user_id, 'super_admin'::user_role) THEN true
    -- Tenant admins can access all departments in their company
    WHEN EXISTS (
      SELECT 1 FROM helpdesk_departments hd
      WHERE hd.id = _department_id
        AND has_role(_user_id, hd.company_id, 'tenant_admin'::user_role)
    ) THEN true
    -- Department managers can access their assigned departments
    WHEN EXISTS (
      SELECT 1 FROM helpdesk_department_managers hdm
      WHERE hdm.user_id = _user_id
        AND hdm.department_id = _department_id
    ) THEN true
    ELSE false
  END
$$;

-- RLS policies for department managers table
CREATE POLICY "Admins can manage department managers"
ON public.helpdesk_department_managers
FOR ALL
USING (
  (company_id = get_user_company(auth.uid()) AND 
   has_role(auth.uid(), company_id, 'tenant_admin'::user_role)) OR 
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "Users can view their department manager assignments"
ON public.helpdesk_department_managers
FOR SELECT
USING (user_id = auth.uid());

-- Update helpdesk_tickets RLS policies to include department access control
DROP POLICY IF EXISTS "Users can view their own requests" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Managers can view team requests" ON public.helpdesk_tickets;

-- Users can view tickets they created
CREATE POLICY "Users can view their own tickets"
ON public.helpdesk_tickets
FOR SELECT
USING (created_by = auth.uid());

-- Users can view tickets assigned to them
CREATE POLICY "Users can view tickets assigned to them"
ON public.helpdesk_tickets
FOR SELECT
USING (assigned_to = auth.uid());

-- Department managers can view tickets in their departments
CREATE POLICY "Department managers can view their department tickets"
ON public.helpdesk_tickets
FOR SELECT
USING (can_access_helpdesk_department(auth.uid(), department_id));

-- Admins can view all tickets in their company
CREATE POLICY "Admins can view all company tickets"
ON public.helpdesk_tickets
FOR SELECT
USING (
  (company_id = get_user_company(auth.uid()) AND 
   has_role(auth.uid(), company_id, 'tenant_admin'::user_role)) OR 
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

-- Update policies for ticket updates
DROP POLICY IF EXISTS "Managers can update requests for approval" ON public.helpdesk_tickets;

CREATE POLICY "Department managers can update their department tickets"
ON public.helpdesk_tickets
FOR UPDATE
USING (
  can_access_helpdesk_department(auth.uid(), department_id) OR
  (company_id = get_user_company(auth.uid()) AND 
   has_role(auth.uid(), company_id, 'tenant_admin'::user_role)) OR 
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_helpdesk_department_managers_user_id 
ON public.helpdesk_department_managers(user_id);

CREATE INDEX IF NOT EXISTS idx_helpdesk_department_managers_department_id 
ON public.helpdesk_department_managers(department_id);

-- Create trigger for updated_at
CREATE TRIGGER update_helpdesk_department_managers_updated_at
BEFORE UPDATE ON public.helpdesk_department_managers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();