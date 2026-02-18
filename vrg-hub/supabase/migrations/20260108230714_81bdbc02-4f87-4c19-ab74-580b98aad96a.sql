-- Add brand_id column to news_articles (NULL = Company Wide)
ALTER TABLE public.news_articles 
ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

-- Add index for filtering by brand
CREATE INDEX idx_news_articles_brand_id ON public.news_articles(brand_id);

-- Add comment explaining the logic
COMMENT ON COLUMN public.news_articles.brand_id IS 'NULL means Company Wide (all brands), otherwise specific to brand';