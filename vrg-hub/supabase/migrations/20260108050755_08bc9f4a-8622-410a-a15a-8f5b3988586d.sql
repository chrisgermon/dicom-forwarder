-- Add column_span to page_modules for grid layout
ALTER TABLE public.page_modules ADD COLUMN column_span integer NOT NULL DEFAULT 12;

-- Add row_index for grouping modules into rows
ALTER TABLE public.page_modules ADD COLUMN row_index integer NOT NULL DEFAULT 0;

-- Add check constraint for valid column spans (4, 6, 8, or 12)
ALTER TABLE public.page_modules ADD CONSTRAINT valid_column_span CHECK (column_span IN (4, 6, 8, 12));