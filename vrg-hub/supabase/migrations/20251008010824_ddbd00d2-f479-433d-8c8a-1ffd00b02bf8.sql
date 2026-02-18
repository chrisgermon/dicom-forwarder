-- Add missing notifyre_fax_id column
ALTER TABLE public.notifyre_fax_logs 
ADD COLUMN IF NOT EXISTS notifyre_fax_id text;

-- Create unique index on notifyre_fax_id where not null
CREATE UNIQUE INDEX IF NOT EXISTS notifyre_fax_logs_notifyre_fax_id_idx 
ON public.notifyre_fax_logs (notifyre_fax_id) 
WHERE notifyre_fax_id IS NOT NULL;

-- Add unique constraint for campaign name per company (only if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifyre_fax_campaigns_company_campaign_unique'
  ) THEN
    ALTER TABLE public.notifyre_fax_campaigns 
    ADD CONSTRAINT notifyre_fax_campaigns_company_campaign_unique 
    UNIQUE (company_id, campaign_name);
  END IF;
END $$;