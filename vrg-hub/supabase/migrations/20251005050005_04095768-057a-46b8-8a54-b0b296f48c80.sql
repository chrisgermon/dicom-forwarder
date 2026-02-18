-- Remove is_active column from halo_integration_settings
ALTER TABLE public.halo_integration_settings DROP COLUMN IF EXISTS is_active;