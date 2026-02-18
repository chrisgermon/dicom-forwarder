-- Add time columns to mlo_visits for calendar integration
ALTER TABLE public.mlo_visits 
ADD COLUMN visit_time TIME,
ADD COLUMN follow_up_time TIME;

-- Add comment explaining usage
COMMENT ON COLUMN public.mlo_visits.visit_time IS 'Time of the visit for calendar sync';
COMMENT ON COLUMN public.mlo_visits.follow_up_time IS 'Time of the follow-up for calendar sync';