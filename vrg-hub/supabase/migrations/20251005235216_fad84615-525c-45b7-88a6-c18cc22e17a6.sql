-- Create platform_permissions table for super_admin global permissions
CREATE TABLE public.platform_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.platform_permissions ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage platform permissions
CREATE POLICY "Super admins can manage platform permissions"
ON public.platform_permissions
FOR ALL
TO authenticated
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Users can view platform permissions for their role
CREATE POLICY "Users can view their role platform permissions"
ON public.platform_permissions
FOR SELECT
TO authenticated
USING (role IN (
  SELECT ur.role 
  FROM user_roles ur 
  WHERE ur.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_platform_permissions_updated_at
BEFORE UPDATE ON public.platform_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default platform-level permissions for super_admin
INSERT INTO public.platform_permissions (role, permission_key, enabled) VALUES
('super_admin', 'manage_all_companies', true),
('super_admin', 'manage_system_users', true),
('super_admin', 'view_all_audit_logs', true),
('super_admin', 'manage_platform_settings', true),
('super_admin', 'manage_integrations', true);

-- Add company_id constraint to role_permissions to make it clear these are company-scoped
COMMENT ON TABLE public.role_permissions IS 'Company-scoped permissions for tenant admins and other roles';
COMMENT ON TABLE public.platform_permissions IS 'Platform-wide permissions for super admins';