-- Fix RLS for creating clinic share links
-- 1) Ensure RLS is enabled
ALTER TABLE public.clinic_shared_links ENABLE ROW LEVEL SECURITY;

-- 2) Drop existing restrictive INSERT policies that are blocking inserts
DROP POLICY IF EXISTS "Users can create share links for their clinics" ON public.clinic_shared_links;
DROP POLICY IF EXISTS "Users can create share links for their company's clinics" ON public.clinic_shared_links;

-- 3) Create PERMISSIVE INSERT policies so any one can satisfy the WITH CHECK
-- Allow company users to create share links for clinics in their company
CREATE POLICY "Users can create share links for their company's clinics"
ON public.clinic_shared_links
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  clinic_network_config_id IN (
    SELECT cnc.id
    FROM public.clinic_network_configs cnc
    WHERE cnc.company_id = get_user_company(auth.uid())
  )
);

-- Allow super admins to create share links for any clinic
CREATE POLICY "Super admins can create share links"
ON public.clinic_shared_links
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  has_global_role(auth.uid(), 'super_admin')
);
