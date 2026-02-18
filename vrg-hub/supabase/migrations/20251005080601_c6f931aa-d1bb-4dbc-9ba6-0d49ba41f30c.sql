-- Fix notifications table - add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN type TEXT;
  END IF;

  -- Add reference_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN reference_id UUID;
  END IF;

  -- Add reference_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'reference_url'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN reference_url TEXT;
  END IF;
END $$;