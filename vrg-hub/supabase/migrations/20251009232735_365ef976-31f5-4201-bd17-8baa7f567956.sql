-- Add from_email flag to track requests created from incoming emails

-- Add to hardware_requests
ALTER TABLE public.hardware_requests 
ADD COLUMN IF NOT EXISTS from_email boolean DEFAULT false;

-- Add to marketing_requests
ALTER TABLE public.marketing_requests 
ADD COLUMN IF NOT EXISTS from_email boolean DEFAULT false;

-- Add to user_account_requests
ALTER TABLE public.user_account_requests 
ADD COLUMN IF NOT EXISTS from_email boolean DEFAULT false;

-- Add to toner_requests
ALTER TABLE public.toner_requests 
ADD COLUMN IF NOT EXISTS from_email boolean DEFAULT false;

-- Add to department_requests
ALTER TABLE public.department_requests 
ADD COLUMN IF NOT EXISTS from_email boolean DEFAULT false;

COMMENT ON COLUMN public.hardware_requests.from_email IS 'Indicates if this request was created from an incoming email';
COMMENT ON COLUMN public.marketing_requests.from_email IS 'Indicates if this request was created from an incoming email';
COMMENT ON COLUMN public.user_account_requests.from_email IS 'Indicates if this request was created from an incoming email';
COMMENT ON COLUMN public.toner_requests.from_email IS 'Indicates if this request was created from an incoming email';
COMMENT ON COLUMN public.department_requests.from_email IS 'Indicates if this request was created from an incoming email';