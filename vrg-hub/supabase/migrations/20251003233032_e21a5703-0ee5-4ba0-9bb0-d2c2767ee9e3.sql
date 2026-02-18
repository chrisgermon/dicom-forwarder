-- Add phone fields and groups to synced_office365_users table
ALTER TABLE public.synced_office365_users 
ADD COLUMN IF NOT EXISTS business_phones jsonb,
ADD COLUMN IF NOT EXISTS mobile_phone text,
ADD COLUMN IF NOT EXISTS member_of jsonb;