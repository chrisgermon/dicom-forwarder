-- Update print_order_brands RLS policies to use new role system

-- Drop old policies
DROP POLICY IF EXISTS "Super admins can manage all brands" ON public.print_order_brands;
DROP POLICY IF EXISTS "Tenant admins can manage their brands" ON public.print_order_brands;
DROP POLICY IF EXISTS "Users can view their company brands" ON public.print_order_brands;
DROP POLICY IF EXISTS "Marketing users can view their company brands" ON public.print_order_brands;

-- Platform admins can manage all brands
CREATE POLICY "Platform admins can manage all brands"
ON public.print_order_brands
FOR ALL
USING (has_platform_role(auth.uid(), ARRAY['platform_admin']));

-- Company admins and owners can manage their company brands
CREATE POLICY "Company admins can manage their brands"
ON public.print_order_brands
FOR ALL
USING (
  has_membership_role(auth.uid(), company_id, ARRAY['company_admin', 'company_owner'])
);

-- All users can view active brands for their company
CREATE POLICY "Users can view their company brands"
ON public.print_order_brands
FOR SELECT
USING (
  is_active = true 
  AND company_id = get_user_primary_company(auth.uid())
);