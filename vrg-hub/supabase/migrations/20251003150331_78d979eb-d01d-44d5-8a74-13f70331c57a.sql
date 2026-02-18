-- Update office365_connections RLS policies to ensure company-level access
-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can manage all connections" ON public.office365_connections;
DROP POLICY IF EXISTS "Users can manage their own connection" ON public.office365_connections;
DROP POLICY IF EXISTS "Users can view their own connection" ON public.office365_connections;

-- Super admins can manage all connections
CREATE POLICY "Super admins can manage all connections"
ON public.office365_connections
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Tenant admins can manage their company's connection
CREATE POLICY "Tenant admins can manage company connection"
ON public.office365_connections
FOR ALL
USING (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
)
WITH CHECK (
  company_id = get_user_company(auth.uid()) 
  AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
);

-- All company users can view their company's connection
CREATE POLICY "Users can view company connection"
ON public.office365_connections
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

-- Remove user_id column as connections are now company-level only
ALTER TABLE public.office365_connections ALTER COLUMN user_id DROP NOT NULL;

-- Update existing connections to be company-level (user_id = NULL)
UPDATE public.office365_connections SET user_id = NULL WHERE user_id IS NOT NULL;