-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule check-reminders to run every hour
-- This will update if it already exists
SELECT cron.schedule(
  'check-reminders-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://qnavtvxemndvrutnavvm.supabase.co/functions/v1/check-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYXZ0dnhlbW5kdnJ1dG5hdnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjAzNTMsImV4cCI6MjA3NTk5NjM1M30.nUbcoWqZidi6961ETUoMnKLJS6LqGnGnSufmW7OWtFk"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);