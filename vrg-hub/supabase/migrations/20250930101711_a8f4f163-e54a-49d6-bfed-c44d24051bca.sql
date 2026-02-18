-- Remove primary_color column from companies table
ALTER TABLE public.companies DROP COLUMN IF EXISTS primary_color;