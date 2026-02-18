-- Unschedule existing jobs if they exist
SELECT cron.unschedule('fetch-mailchimp-campaigns-every-2h') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'fetch-mailchimp-campaigns-every-2h'
);

SELECT cron.unschedule('sync-notifyre-fax-logs-every-2h') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-notifyre-fax-logs-every-2h'
);

-- Schedule Mailchimp campaigns sync every 2 hours
SELECT cron.schedule(
  'fetch-mailchimp-campaigns-every-2h',
  '0 */2 * * *', -- At minute 0 of every 2nd hour
  $$
  SELECT
    net.http_post(
        url:='https://qnavtvxemndvrutnavvm.supabase.co/functions/v1/fetch-mailchimp-campaigns',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYXZ0dnhlbW5kdnJ1dG5hdnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjAzNTMsImV4cCI6MjA3NTk5NjM1M30.nUbcoWqZidi6961ETUoMnKLJS6LqGnGnSufmW7OWtFk"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Schedule Notifyre fax logs sync every 2 hours (offset by 5 minutes)
SELECT cron.schedule(
  'sync-notifyre-fax-logs-every-2h',
  '5 */2 * * *', -- At minute 5 of every 2nd hour
  $$
  SELECT
    net.http_post(
        url:='https://qnavtvxemndvrutnavvm.supabase.co/functions/v1/sync-notifyre-fax-logs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYXZ0dnhlbW5kdnJ1dG5hdnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjAzNTMsImV4cCI6MjA3NTk5NjM1M30.nUbcoWqZidi6961ETUoMnKLJS6LqGnGnSufmW7OWtFk"}'::jsonb,
        body:='{"force_full_sync": false}'::jsonb
    ) as request_id;
  $$
);