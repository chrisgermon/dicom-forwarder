-- Fix RLS policies for clinic_shared_links table
-- Allow users to create share links for clinics in their company

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can create share links for their company's clinics" ON public.clinic_shared_links;
DROP POLICY IF EXISTS "Users can view their company's share links" ON public.clinic_shared_links;

-- Allow users to insert share links for clinics in their company
CREATE POLICY "Users can create share links for their company's clinics"
ON public.clinic_shared_links
FOR INSERT
WITH CHECK (
  clinic_network_config_id IN (
    SELECT cnc.id 
    FROM public.clinic_network_configs cnc
    INNER JOIN public.profiles p ON p.company_id = cnc.company_id
    WHERE p.user_id = auth.uid()
  )
);

-- Allow users to view their company's share links
CREATE POLICY "Users can view their company's share links"
ON public.clinic_shared_links
FOR SELECT
USING (
  clinic_network_config_id IN (
    SELECT cnc.id 
    FROM public.clinic_network_configs cnc
    INNER JOIN public.profiles p ON p.company_id = cnc.company_id
    WHERE p.user_id = auth.uid()
  )
);

-- Allow users to update their company's share links
CREATE POLICY "Users can update their company's share links"
ON public.clinic_shared_links
FOR UPDATE
USING (
  clinic_network_config_id IN (
    SELECT cnc.id 
    FROM public.clinic_network_configs cnc
    INNER JOIN public.profiles p ON p.company_id = cnc.company_id
    WHERE p.user_id = auth.uid()
  )
);