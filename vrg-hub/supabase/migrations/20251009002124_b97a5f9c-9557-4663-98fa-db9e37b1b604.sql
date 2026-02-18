-- Add sub_request_type column for hierarchical notifications
ALTER TABLE public.request_type_notifications
ADD COLUMN IF NOT EXISTS sub_request_type text;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_request_type_notifications_lookup 
ON public.request_type_notifications(company_id, request_type, sub_request_type);

-- Drop the old unique constraint
ALTER TABLE public.request_type_notifications
DROP CONSTRAINT IF EXISTS request_type_notifications_company_id_request_type_user_id_key;

-- Create unique constraint for non-null sub_request_type
CREATE UNIQUE INDEX IF NOT EXISTS request_type_notifications_unique_with_subtype
ON public.request_type_notifications(company_id, request_type, user_id, sub_request_type)
WHERE sub_request_type IS NOT NULL;

-- Create unique constraint for null sub_request_type
CREATE UNIQUE INDEX IF NOT EXISTS request_type_notifications_unique_without_subtype
ON public.request_type_notifications(company_id, request_type, user_id)
WHERE sub_request_type IS NULL;