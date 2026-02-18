-- Add column to track if user has seen theme preference dialog
ALTER TABLE public.profiles 
ADD COLUMN has_seen_theme_dialog boolean NOT NULL DEFAULT false;