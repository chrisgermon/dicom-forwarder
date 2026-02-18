-- Update RLS policies for user_offboarding_requests to use permission system

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view company offboarding requests" ON public.user_offboarding_requests;
DROP POLICY IF EXISTS "Admins can update offboarding requests" ON public.user_offboarding_requests;

-- Create new permission-based policies
CREATE POLICY "Users with permission can view company offboarding requests"
ON public.user_offboarding_requests
FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid() OR
  has_permission(auth.uid(), company_id, 'manage_user_offboarding'::permission_type) OR
  has_permission(auth.uid(), company_id, 'manage_user_accounts'::permission_type) OR
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "Users with permission can update offboarding requests"
ON public.user_offboarding_requests
FOR UPDATE
TO authenticated
USING (
  has_permission(auth.uid(), company_id, 'manage_user_offboarding'::permission_type) OR
  has_permission(auth.uid(), company_id, 'manage_user_accounts'::permission_type) OR
  has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

-- Update has_permission function to include new permission mapping
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _company_id uuid, _permission permission_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First check for explicit user permission override
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _user_id
        AND company_id = _company_id
        AND permission = _permission
    ) THEN (
      SELECT granted FROM public.user_permissions
      WHERE user_id = _user_id
        AND company_id = _company_id
        AND permission = _permission
      LIMIT 1
    )
    -- Otherwise check role-based permissions
    ELSE (
      SELECT CASE
        WHEN _permission IN ('manage_company', 'manage_users', 'view_audit_logs') THEN
          has_role(_user_id, _company_id, 'tenant_admin'::user_role) OR has_global_role(_user_id, 'super_admin'::user_role)
        WHEN _permission IN ('approve_requests', 'manage_catalog', 'manage_news', 'manage_newsletter', 'manage_user_accounts', 'manage_user_offboarding') THEN
          has_role(_user_id, _company_id, 'manager'::user_role) OR has_role(_user_id, _company_id, 'tenant_admin'::user_role) OR has_global_role(_user_id, 'super_admin'::user_role)
        WHEN _permission IN ('create_requests', 'view_requests') THEN
          true -- All authenticated users
        ELSE false
      END
    )
  END
$$;