-- Create role permissions table with text role type
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('requester', 'approver', 'company_admin', 'company_owner')),
  permission permission_type NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, role, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company admins can manage role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users can view role permissions for their company" ON public.role_permissions;

-- RLS Policies
CREATE POLICY "Company admins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (
  has_membership_role(auth.uid(), company_id, ARRAY['company_admin', 'company_owner'])
  OR has_platform_role(auth.uid(), ARRAY['platform_admin'])
)
WITH CHECK (
  has_membership_role(auth.uid(), company_id, ARRAY['company_admin', 'company_owner'])
  OR has_platform_role(auth.uid(), ARRAY['platform_admin'])
);

CREATE POLICY "Users can view role permissions for their company"
ON public.role_permissions
FOR SELECT
USING (company_id = get_user_primary_company(auth.uid()));

-- Add trigger
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();