-- Schedule sync at 2am AEST daily (4pm UTC)
SELECT cron.schedule(
  'nightly-referrer-sync',
  '0 16 * * *',
  $$
  SELECT extensions.http_post(
    'https://qnavtvxemndvrutnavvm.supabase.co/functions/v1/sync-referrers'::text,
    '{}'::text,
    'application/json'::text
  );
  $$
);