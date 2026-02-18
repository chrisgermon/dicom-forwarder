-- Update RLS policies for company-specific news access

-- Super admins can view all articles
DROP POLICY IF EXISTS "Super admins can view all articles" ON public.news_articles;
CREATE POLICY "Super admins can view all articles"
ON public.news_articles
FOR SELECT
TO authenticated
USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Super admins can create articles for any company
DROP POLICY IF EXISTS "Super admins can create articles" ON public.news_articles;
CREATE POLICY "Super admins can create articles"
ON public.news_articles
FOR INSERT
TO authenticated
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Super admins can update all articles
DROP POLICY IF EXISTS "Super admins can update all articles" ON public.news_articles;
CREATE POLICY "Super admins can update all articles"
ON public.news_articles
FOR UPDATE
TO authenticated
USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Super admins can delete all articles
DROP POLICY IF EXISTS "Super admins can delete all articles" ON public.news_articles;
CREATE POLICY "Super admins can delete all articles"
ON public.news_articles
FOR DELETE
TO authenticated
USING (has_global_role(auth.uid(), 'super_admin'::user_role));