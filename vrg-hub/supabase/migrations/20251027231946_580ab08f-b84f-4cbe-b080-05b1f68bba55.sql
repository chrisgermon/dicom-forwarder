-- Add CC emails field to tickets table
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS cc_emails TEXT[] DEFAULT '{}';

-- Add CC emails field to hardware_requests table for backward compatibility
ALTER TABLE public.hardware_requests
ADD COLUMN IF NOT EXISTS cc_emails TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.tickets.cc_emails IS 'Carbon copy email addresses for notifications';
COMMENT ON COLUMN public.hardware_requests.cc_emails IS 'Carbon copy email addresses for notifications';
