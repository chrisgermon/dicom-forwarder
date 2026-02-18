-- Drop existing cron job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('office365-sync-daily');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create cron job to sync Office 365 data every day at 11pm
SELECT cron.schedule(
  'office365-sync-daily',
  '0 23 * * *', -- Every day at 11:00 PM
  $$
  SELECT
    net.http_post(
        url:='https://qnavtvxemndvrutnavvm.supabase.co/functions/v1/office365-cron-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYXZ0dnhlbW5kdnJ1dG5hdnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjAzNTMsImV4cCI6MjA3NTk5NjM1M30.nUbcoWqZidi6961ETUoMnKLJS6LqGnGnSufmW7OWtFk"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);