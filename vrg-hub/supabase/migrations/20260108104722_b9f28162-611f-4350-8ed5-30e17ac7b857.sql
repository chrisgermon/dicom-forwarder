-- Remove the old cron job
SELECT cron.unschedule('nightly-referrer-sync');