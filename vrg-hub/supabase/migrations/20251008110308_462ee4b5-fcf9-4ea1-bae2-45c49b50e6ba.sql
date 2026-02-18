-- Drop the foreign key constraint that only references hardware_requests
ALTER TABLE public.request_attachments
DROP CONSTRAINT IF EXISTS request_attachments_request_id_fkey;

-- The request_type field already indicates which table the request_id references
-- We'll rely on application logic to ensure data integrity since we have multiple request types