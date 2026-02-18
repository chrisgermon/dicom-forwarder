-- Create table to store HR document mappings
CREATE TABLE public.hr_document_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key TEXT NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hr_document_mappings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read mappings
CREATE POLICY "Anyone can read HR document mappings"
ON public.hr_document_mappings
FOR SELECT
TO authenticated
USING (true);

-- Only super admins can modify mappings
CREATE POLICY "Super admins can insert HR document mappings"
ON public.hr_document_mappings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rbac_user_roles ur
    JOIN rbac_roles r ON ur.role_id = r.id
    JOIN rbac_role_permissions rp ON r.id = rp.role_id
    JOIN rbac_permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND p.resource = 'system_settings'
    AND p.action = 'manage'
  )
);

CREATE POLICY "Super admins can update HR document mappings"
ON public.hr_document_mappings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rbac_user_roles ur
    JOIN rbac_roles r ON ur.role_id = r.id
    JOIN rbac_role_permissions rp ON r.id = rp.role_id
    JOIN rbac_permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND p.resource = 'system_settings'
    AND p.action = 'manage'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_hr_document_mappings_updated_at
BEFORE UPDATE ON public.hr_document_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();