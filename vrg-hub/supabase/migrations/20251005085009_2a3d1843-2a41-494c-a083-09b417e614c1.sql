-- Add delta link columns to office365_connections for differential sync
ALTER TABLE public.office365_connections 
ADD COLUMN IF NOT EXISTS users_delta_link TEXT,
ADD COLUMN IF NOT EXISTS groups_delta_link TEXT;

-- Create a cron job to sync Office 365 data hourly
SELECT cron.schedule(
  'office365-hourly-sync',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://znpjdrmvjfmneotdhwdo.supabase.co/functions/v1/office365-cron-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGpkcm12amZtbmVvdGRod2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NjgzMjMsImV4cCI6MjA3NDU0NDMyM30.xSQo1MWITgTvdgePDPjpy8pVs4i-LL-4nWqZAScrGKU"}'::jsonb,
        body:=concat('{"triggered_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);