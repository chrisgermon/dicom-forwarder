-- Broaden SELECT policy for print_order_brands to any active membership, not just primary company

DROP POLICY IF EXISTS "Users can view their company brands" ON public.print_order_brands;

-- Allow any active member (any role) of the company to view active brands
CREATE POLICY "Users can view their company brands"
ON public.print_order_brands
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = print_order_brands.company_id
      AND cm.status = 'active'
  )
);
