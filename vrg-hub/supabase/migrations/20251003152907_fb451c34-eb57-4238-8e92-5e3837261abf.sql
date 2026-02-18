-- Add order tracking columns to hardware_requests
ALTER TABLE public.hardware_requests
ADD COLUMN IF NOT EXISTS eta_delivery DATE,
ADD COLUMN IF NOT EXISTS tracking_link TEXT;