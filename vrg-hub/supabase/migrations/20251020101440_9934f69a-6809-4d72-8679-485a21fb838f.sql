-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job to sync Notifyre fax logs every 2 hours
SELECT cron.schedule(
  'sync-notifyre-fax-logs-every-2-hours',
  '0 */2 * * *', -- At minute 0 past every 2nd hour
  $$
  SELECT
    net.http_post(
        url:='https://qnavtvxemndvrutnavvm.supabase.co/functions/v1/sync-notifyre-fax-logs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYXZ0dnhlbW5kdnJ1dG5hdnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjAzNTMsImV4cCI6MjA3NTk5NjM1M30.nUbcoWqZidi6961ETUoMnKLJS6LqGnGnSufmW7OWtFk"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);