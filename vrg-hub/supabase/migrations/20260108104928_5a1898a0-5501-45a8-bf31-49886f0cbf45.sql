-- Drop the old constraint and create a new one that includes clinic_key
ALTER TABLE public.referrer_directory DROP CONSTRAINT IF EXISTS referrer_directory_referrer_key_provider_number_key;

-- Create new unique constraint including clinic_key (a referrer can appear at multiple clinics)
ALTER TABLE public.referrer_directory ADD CONSTRAINT referrer_directory_unique_key UNIQUE (referrer_key, provider_number, clinic_key);

-- Truncate existing data to start fresh
TRUNCATE TABLE public.referrer_directory;