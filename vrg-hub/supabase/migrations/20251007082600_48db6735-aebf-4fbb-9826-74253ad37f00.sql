-- Add RLS policy for platform admins to manage company home pages
CREATE POLICY "Platform admins can manage all company home pages"
ON public.company_home_pages
FOR ALL
TO public
USING (has_platform_role(auth.uid(), ARRAY['platform_admin']));