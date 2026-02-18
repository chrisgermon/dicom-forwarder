-- Update default currency to AUD for hardware_requests table
ALTER TABLE public.hardware_requests 
ALTER COLUMN currency SET DEFAULT 'AUD';

-- Update any existing requests with USD to AUD (optional - uncomment if you want to update existing data)
-- UPDATE public.hardware_requests SET currency = 'AUD' WHERE currency = 'USD';