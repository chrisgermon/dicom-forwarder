-- Add follow_up_location column to mlo_visits table
ALTER TABLE public.mlo_visits 
ADD COLUMN follow_up_location TEXT;