-- Allow managers to manage their company home page layout
DROP POLICY IF EXISTS "Managers can manage their company home page" ON public.company_home_pages;
CREATE POLICY "Managers can manage their company home page"
ON public.company_home_pages
FOR ALL
TO public
USING ((company_id = get_user_company(auth.uid())) AND (
  has_role(auth.uid(), company_id, 'manager'::user_role)
))
WITH CHECK ((company_id = get_user_company(auth.uid())) AND (
  has_role(auth.uid(), company_id, 'manager'::user_role)
));