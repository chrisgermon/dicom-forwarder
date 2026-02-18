-- Add clinic_name field to hardware_requests table
ALTER TABLE public.hardware_requests 
ADD COLUMN clinic_name text;