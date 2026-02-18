-- Add sync_type column to track full vs incremental syncs
ALTER TABLE public.referrer_sync_history 
ADD COLUMN IF NOT EXISTS sync_type text DEFAULT 'full';

-- Add comment for clarity
COMMENT ON COLUMN public.referrer_sync_history.sync_type IS 'Type of sync: full or incremental';