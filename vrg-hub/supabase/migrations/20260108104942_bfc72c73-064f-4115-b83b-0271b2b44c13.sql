-- Create a function to truncate referrer_directory (RLS bypass for service role)
CREATE OR REPLACE FUNCTION public.truncate_referrer_directory()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.referrer_directory;
END;
$$;

-- Create a function to truncate clinic_directory
CREATE OR REPLACE FUNCTION public.truncate_clinic_directory()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.clinic_directory;
END;
$$;