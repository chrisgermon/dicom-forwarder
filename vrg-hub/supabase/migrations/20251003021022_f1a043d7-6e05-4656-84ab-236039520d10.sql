-- Enable pg_cron extension for scheduled jobs
create extension if not exists pg_cron with schema extensions;

-- Enable pg_net extension for HTTP requests
create extension if not exists pg_net with schema extensions;

-- Schedule Office 365 sync to run every day at 3:00 AM
select cron.schedule(
  'office365-daily-sync',
  '0 3 * * *', -- At 3:00 AM every day
  $$
  select
    net.http_post(
        url:='https://znpjdrmvjfmneotdhwdo.supabase.co/functions/v1/office365-cron-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGpkcm12amZtbmVvdGRod2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NjgzMjMsImV4cCI6MjA3NDU0NDMyM30.xSQo1MWITgTvdgePDPjpy8pVs4i-LL-4nWqZAScrGKU"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);