-- Add unique constraint on notifyre_fax_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifyre_fax_logs_notifyre_fax_id_key'
  ) THEN
    ALTER TABLE public.notifyre_fax_logs 
    ADD CONSTRAINT notifyre_fax_logs_notifyre_fax_id_key UNIQUE (notifyre_fax_id);
  END IF;
END $$;