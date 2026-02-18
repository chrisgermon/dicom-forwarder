-- Add last_login column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON public.profiles(last_login DESC);

-- Add comment to column
COMMENT ON COLUMN public.profiles.last_login IS 'Timestamp of the user''s last successful login';