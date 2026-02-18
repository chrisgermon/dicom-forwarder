-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule newsletter reminder cron to run every hour
-- This will check for reminders to send based on cycle dates
SELECT cron.schedule(
  'newsletter-reminders',
  '0 * * * *', -- Every hour on the hour
  $$
  SELECT
    net.http_post(
      url:='https://znpjdrmvjfmneotdhwdo.supabase.co/functions/v1/newsletter-cron-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGpkcm12amZtbmVvdGRod2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NjgzMjMsImV4cCI6MjA3NDU0NDMyM30.xSQo1MWITgTvdgePDPjpy8pVs4i-LL-4nWqZAScrGKU"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);