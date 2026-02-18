-- Update the user invite status to accepted for Daniel Hilbert
UPDATE public.user_invites
SET 
  status = 'accepted',
  accepted_at = now()
WHERE email = 'daniel@pinnaclemi.com.au'
  AND status = 'pending';