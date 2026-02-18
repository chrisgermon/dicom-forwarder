-- Allow public inserts to qr_code_scans for tracking QR code scans
-- This is needed because scans happen without authentication
CREATE POLICY "Anyone can insert QR code scans" 
ON public.qr_code_scans 
FOR INSERT 
WITH CHECK (true);