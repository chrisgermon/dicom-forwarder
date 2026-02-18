-- Add custom label and icon to menu configurations
ALTER TABLE public.menu_configurations
ADD COLUMN custom_label TEXT,
ADD COLUMN custom_icon TEXT;