-- Update toner_requests table with new fields
ALTER TABLE public.toner_requests
ADD COLUMN site TEXT,
ADD COLUMN colors_required TEXT[],
ADD COLUMN predicted_toner_models TEXT,
ADD COLUMN eta_delivery DATE,
ADD COLUMN tracking_link TEXT;

-- Update RLS policies - only super admins can mark as complete
DROP POLICY IF EXISTS "Managers can update toner requests" ON public.toner_requests;

CREATE POLICY "Super admins can update toner requests"
ON public.toner_requests
FOR UPDATE
USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Update the view policy
DROP POLICY IF EXISTS "Managers can view company toner requests" ON public.toner_requests;

CREATE POLICY "Super admins can view all toner requests"
ON public.toner_requests
FOR SELECT
USING (has_global_role(auth.uid(), 'super_admin'::user_role));

COMMENT ON COLUMN public.toner_requests.site IS 'Site/clinic location for the toner request';
COMMENT ON COLUMN public.toner_requests.colors_required IS 'Array of colors needed (e.g., Black, Cyan, Magenta, Yellow)';
COMMENT ON COLUMN public.toner_requests.predicted_toner_models IS 'AI-predicted exact toner model numbers based on printer and colors';
COMMENT ON COLUMN public.toner_requests.eta_delivery IS 'Estimated delivery date set by admin';
COMMENT ON COLUMN public.toner_requests.tracking_link IS 'Tracking URL for the delivery';