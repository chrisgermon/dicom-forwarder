-- Fix notifications table schema - make notification_type nullable or remove it
DO $$ 
BEGIN
  -- Check if notification_type column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'notification_type'
  ) THEN
    -- Make it nullable since we're using 'type' column instead
    ALTER TABLE public.notifications ALTER COLUMN notification_type DROP NOT NULL;
  END IF;
END $$;