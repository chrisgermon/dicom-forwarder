-- Drop existing policies that depend on company_id
DROP POLICY IF EXISTS "Company users can view their applications" ON public.applications;
DROP POLICY IF EXISTS "Tenant admins can manage company applications" ON public.applications;

-- Remove company_id from applications table (make it global)
ALTER TABLE public.applications DROP COLUMN company_id;

-- Create company_applications junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.company_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, application_id)
);

-- Enable RLS
ALTER TABLE public.company_applications ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all company applications
CREATE POLICY "Super admins can manage all company applications"
ON public.company_applications
FOR ALL
TO authenticated
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Tenant admins can manage their company applications
CREATE POLICY "Tenant admins can manage their company applications"
ON public.company_applications
FOR ALL
TO authenticated
USING (has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
WITH CHECK (has_role(auth.uid(), company_id, 'tenant_admin'::user_role));

-- Users can view their company applications
CREATE POLICY "Company users can view their company applications"
ON public.company_applications
FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- Create new RLS policies for applications table to work with junction table
-- Users can view applications assigned to their company
CREATE POLICY "Users can view applications for their company"
ON public.applications
FOR SELECT
TO authenticated
USING (
  active = true AND (
    id IN (
      SELECT application_id 
      FROM public.company_applications 
      WHERE company_id = get_user_company(auth.uid())
    )
  )
);

-- Tenant admins and super admins can manage applications
CREATE POLICY "Admins can manage applications"
ON public.applications
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
  has_global_role(auth.uid(), 'super_admin'::user_role)
)
WITH CHECK (
  has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
  has_global_role(auth.uid(), 'super_admin'::user_role)
);