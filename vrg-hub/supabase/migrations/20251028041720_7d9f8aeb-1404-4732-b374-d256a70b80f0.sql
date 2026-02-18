-- Force PostgREST to refresh its schema cache so new columns are recognized
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload schema cache');
  PERFORM pg_notify('pgrst', 'reload config');
END $$;