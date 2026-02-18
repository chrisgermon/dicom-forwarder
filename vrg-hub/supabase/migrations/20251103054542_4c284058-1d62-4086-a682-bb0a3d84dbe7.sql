-- Add heading_id column to menu_configurations to reference global headings
ALTER TABLE public.menu_configurations
ADD COLUMN heading_id UUID REFERENCES public.menu_headings(id) ON DELETE CASCADE;