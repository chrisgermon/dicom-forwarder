-- Drop the roster_entries table since we're simplifying to PDF-only uploads
-- The table and its data are no longer needed

DROP TABLE IF EXISTS public.roster_entries CASCADE;