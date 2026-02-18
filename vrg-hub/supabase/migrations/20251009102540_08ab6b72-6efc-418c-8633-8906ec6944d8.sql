-- Add missing columns to request_comments table
ALTER TABLE public.request_comments 
  ADD COLUMN IF NOT EXISTS comment_text TEXT,
  ADD COLUMN IF NOT EXISTS request_type TEXT,
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- Migrate existing data if comment column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'request_comments' 
    AND column_name = 'comment'
  ) THEN
    UPDATE public.request_comments 
    SET comment_text = comment 
    WHERE comment_text IS NULL AND comment IS NOT NULL;
  END IF;
END $$;