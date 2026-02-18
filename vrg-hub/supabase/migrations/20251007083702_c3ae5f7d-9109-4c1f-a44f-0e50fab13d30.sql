-- Ensure UPSERT on company_home_pages works by adding a unique index on company_id
CREATE UNIQUE INDEX IF NOT EXISTS company_home_pages_company_id_unique
ON public.company_home_pages (company_id);

-- Strengthen RLS to allow inserts/updates for existing admin policies by ensuring WITH CHECK mirrors USING
-- Drop and recreate Platform admins policy
DROP POLICY IF EXISTS "Platform admins can manage all company home pages" ON public.company_home_pages;
CREATE POLICY "Platform admins can manage all company home pages"
ON public.company_home_pages
FOR ALL
TO public
USING (has_platform_role(auth.uid(), ARRAY['platform_admin']))
WITH CHECK (has_platform_role(auth.uid(), ARRAY['platform_admin']));

-- Drop and recreate Super admins policy with WITH CHECK
DROP POLICY IF EXISTS "Super admins can manage all company home pages" ON public.company_home_pages;
CREATE POLICY "Super admins can manage all company home pages"
ON public.company_home_pages
FOR ALL
TO public
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Drop and recreate Tenant admins policy with WITH CHECK
DROP POLICY IF EXISTS "Tenant admins can manage their company home page" ON public.company_home_pages;
CREATE POLICY "Tenant admins can manage their company home page"
ON public.company_home_pages
FOR ALL
TO public
USING ((company_id = get_user_company(auth.uid())) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
WITH CHECK ((company_id = get_user_company(auth.uid())) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role));