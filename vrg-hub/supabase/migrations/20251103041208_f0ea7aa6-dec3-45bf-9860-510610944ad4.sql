-- Add support for custom menu headings
-- Menu configurations already support item_type and sort_order
-- Just need to add a custom_heading_label column for user-defined headings

ALTER TABLE public.menu_configurations
ADD COLUMN IF NOT EXISTS custom_heading_label TEXT;

COMMENT ON COLUMN public.menu_configurations.custom_heading_label IS 'Custom label for heading-type menu items';