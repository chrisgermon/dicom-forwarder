-- Add missing columns to sharepoint_configurations table
ALTER TABLE public.sharepoint_configurations
ADD COLUMN IF NOT EXISTS site_name TEXT,
ADD COLUMN IF NOT EXISTS configured_by UUID REFERENCES auth.users(id);