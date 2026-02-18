-- Add cc_emails column to request_types
ALTER TABLE request_types 
ADD COLUMN IF NOT EXISTS cc_emails text[] DEFAULT '{}';

COMMENT ON COLUMN request_types.cc_emails IS 'Default CC email addresses for all requests of this type';

-- Add cc_emails column to request_categories
ALTER TABLE request_categories 
ADD COLUMN IF NOT EXISTS cc_emails text[] DEFAULT '{}';

COMMENT ON COLUMN request_categories.cc_emails IS 'Default CC email addresses for all requests in this category';