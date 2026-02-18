
-- Business directory listings per location
CREATE TABLE public.business_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- e.g. 'google_business', 'apple_maps', 'bing_places', 'yelp', 'healthdirect', 'hotdoc', 'yellow_pages', 'true_local'
  listing_url TEXT,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, claimed, verified, needs_update, suspended, not_applicable
  notes TEXT,
  last_verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, platform)
);

-- Enable RLS
ALTER TABLE public.business_listings ENABLE ROW LEVEL SECURITY;

-- Admins and marketing roles can view
CREATE POLICY "Authenticated users can view business listings"
  ON public.business_listings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins and marketing can insert
CREATE POLICY "Marketing and admins can insert business listings"
  ON public.business_listings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins and marketing can update
CREATE POLICY "Marketing and admins can update business listings"
  ON public.business_listings FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Admins can delete
CREATE POLICY "Admins can delete business listings"
  ON public.business_listings FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_business_listings_updated_at
  BEFORE UPDATE ON public.business_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
