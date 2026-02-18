-- Add nearest_location_id column to referrer_directory
ALTER TABLE public.referrer_directory 
ADD COLUMN IF NOT EXISTS nearest_location_id uuid REFERENCES public.locations(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrer_directory_nearest_location 
ON public.referrer_directory(nearest_location_id);

-- Create index on locations for state lookups
CREATE INDEX IF NOT EXISTS idx_locations_state 
ON public.locations(state) WHERE is_active = true;