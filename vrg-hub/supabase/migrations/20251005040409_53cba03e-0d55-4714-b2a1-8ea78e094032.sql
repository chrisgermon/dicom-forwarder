-- Allow authors to update their own articles
CREATE POLICY "Authors can update their own articles"
ON public.news_articles
FOR UPDATE
TO authenticated
USING (author_id = auth.uid());

-- Allow authors to delete their own articles
CREATE POLICY "Authors can delete their own articles"
ON public.news_articles
FOR DELETE
TO authenticated
USING (author_id = auth.uid());