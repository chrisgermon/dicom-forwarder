-- Add unique constraint for sharepoint_cache
ALTER TABLE public.sharepoint_cache 
ADD CONSTRAINT sharepoint_cache_company_item_unique 
UNIQUE (company_id, item_id);