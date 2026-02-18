-- Add missing user_agent column to audit_logs table
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.audit_logs.user_agent IS 'Browser/client user agent string captured during login';