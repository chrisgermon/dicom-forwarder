-- Add brand and clinic fields to marketing_requests table
ALTER TABLE public.marketing_requests
ADD COLUMN brand text,
ADD COLUMN clinic text;

-- Create indexes for better query performance
CREATE INDEX idx_marketing_requests_brand ON public.marketing_requests(brand);
CREATE INDEX idx_marketing_requests_clinic ON public.marketing_requests(clinic);