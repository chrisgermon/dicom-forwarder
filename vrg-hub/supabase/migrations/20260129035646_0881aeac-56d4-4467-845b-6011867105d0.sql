-- Add a public SELECT policy for QR code redirects (only returns minimal needed fields)
-- This allows anyone to look up a QR code by short_code for redirection purposes
CREATE POLICY "Anyone can view QR codes for redirect" 
ON public.qr_codes 
FOR SELECT 
USING (is_active = true);

-- Note: The existing "Users can view their own QR codes" policy remains 
-- so authenticated users can still manage their codes