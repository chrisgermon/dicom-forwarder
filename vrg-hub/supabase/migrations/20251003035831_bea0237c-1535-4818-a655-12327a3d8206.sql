-- Add company_id to system_statuses and update policies

-- Add company_id column
ALTER TABLE public.system_statuses
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Make company_id not null for new records (existing records can be null for migration)
-- Add index for company queries
CREATE INDEX idx_system_statuses_company ON public.system_statuses(company_id, is_active, sort_order);

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view active system statuses" ON public.system_statuses;
DROP POLICY IF EXISTS "Super admins can manage system statuses" ON public.system_statuses;

-- Create new company-specific policies
CREATE POLICY "Users can view their company's active system statuses"
  ON public.system_statuses
  FOR SELECT
  USING (
    is_active = true 
    AND company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Super admins can view all system statuses"
  ON public.system_statuses
  FOR SELECT
  USING (has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Tenant admins can manage their company system statuses"
  ON public.system_statuses
  FOR ALL
  USING (
    company_id = get_user_company(auth.uid())
    AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
  );

CREATE POLICY "Super admins can manage all system statuses"
  ON public.system_statuses
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role))
  WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));