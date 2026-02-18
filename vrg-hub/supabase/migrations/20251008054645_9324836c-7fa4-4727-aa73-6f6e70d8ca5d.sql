-- Enable pg_cron extension if not already enabled
create extension if not exists pg_cron with schema extensions;

-- Enable pg_net extension if not already enabled
create extension if not exists pg_net with schema extensions;

-- Drop existing schedule if it exists (ignore error if it doesn't exist)
do $$
begin
  perform cron.unschedule('sync-notifyre-fax-logs-every-2-hours');
exception when others then
  null;
end $$;

-- Schedule the sync-notifyre-fax-logs function to run every 2 hours
select cron.schedule(
  'sync-notifyre-fax-logs-every-2-hours',
  '0 */2 * * *', -- At minute 0 past every 2nd hour
  $$
  select
    net.http_post(
        url:='https://znpjdrmvjfmneotdhwdo.supabase.co/functions/v1/sync-notifyre-fax-logs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGpkcm12amZtbmVvdGRod2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NjgzMjMsImV4cCI6MjA3NDU0NDMyM30.xSQo1MWITgTvdgePDPjpy8pVs4i-LL-4nWqZAScrGKU"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);