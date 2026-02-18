-- Create news articles table
CREATE TABLE public.news_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create news article permissions table for individual user access
CREATE TABLE public.news_article_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_article_permissions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user can manage news articles
CREATE OR REPLACE FUNCTION public.can_manage_news(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Manager or admin role
    has_role(_user_id, _company_id, 'manager'::user_role) OR
    has_role(_user_id, _company_id, 'tenant_admin'::user_role) OR
    has_global_role(_user_id, 'super_admin'::user_role) OR
    -- Specific permission granted
    EXISTS (
      SELECT 1 FROM public.news_article_permissions
      WHERE user_id = _user_id AND company_id = _company_id
    )
  )
$$;

-- RLS Policies for news_articles
CREATE POLICY "Users can view published articles from their company"
  ON public.news_articles
  FOR SELECT
  USING (
    status = 'published' AND 
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Article managers can view all company articles"
  ON public.news_articles
  FOR SELECT
  USING (can_manage_news(auth.uid(), company_id));

CREATE POLICY "Article managers can create articles"
  ON public.news_articles
  FOR INSERT
  WITH CHECK (
    can_manage_news(auth.uid(), company_id) AND
    author_id = auth.uid()
  );

CREATE POLICY "Article managers can update articles"
  ON public.news_articles
  FOR UPDATE
  USING (can_manage_news(auth.uid(), company_id));

CREATE POLICY "Article managers can delete articles"
  ON public.news_articles
  FOR DELETE
  USING (can_manage_news(auth.uid(), company_id));

-- RLS Policies for news_article_permissions
CREATE POLICY "Users can view their own permissions"
  ON public.news_article_permissions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage permissions"
  ON public.news_article_permissions
  FOR ALL
  USING (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- Trigger to update updated_at
CREATE TRIGGER update_news_articles_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for article images
CREATE POLICY "Anyone can view article images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'news-images');

CREATE POLICY "Article managers can upload images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'news-images' AND
    EXISTS (
      SELECT 1 FROM public.news_article_permissions
      WHERE user_id = auth.uid()
    ) OR
    has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
    has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

CREATE POLICY "Article managers can update their images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'news-images' AND (
      EXISTS (
        SELECT 1 FROM public.news_article_permissions
        WHERE user_id = auth.uid()
      ) OR
      has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
      has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
      has_global_role(auth.uid(), 'super_admin'::user_role)
    )
  );

CREATE POLICY "Article managers can delete their images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'news-images' AND (
      EXISTS (
        SELECT 1 FROM public.news_article_permissions
        WHERE user_id = auth.uid()
      ) OR
      has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
      has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
      has_global_role(auth.uid(), 'super_admin'::user_role)
    )
  );