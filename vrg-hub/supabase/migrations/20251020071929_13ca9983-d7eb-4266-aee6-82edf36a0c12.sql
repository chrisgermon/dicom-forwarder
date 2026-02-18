-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the check-reminders function to run every minute
SELECT cron.schedule(
  'check-reminders-every-minute',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://qnavtvxemndvrutnavvm.supabase.co/functions/v1/check-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYXZ0dnhlbW5kdnJ1dG5hdnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjAzNTMsImV4cCI6MjA3NTk5NjM1M30.nUbcoWqZidi6961ETUoMnKLJS6LqGnGnSufmW7OWtFk"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);