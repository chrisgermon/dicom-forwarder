-- Drop the existing table and create a new one for clinic sharing
DROP TABLE IF EXISTS public.shared_modality_links CASCADE;

CREATE TABLE public.shared_clinic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.shared_clinic_links ENABLE ROW LEVEL SECURITY;

-- Admins can manage share links
CREATE POLICY "Admins can manage clinic share links"
  ON public.shared_clinic_links
  FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone can read active share links with valid token (for public access)
CREATE POLICY "Anyone can read active clinic share links"
  ON public.shared_clinic_links
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Create indexes
CREATE INDEX idx_shared_clinic_links_token ON public.shared_clinic_links(share_token);
CREATE INDEX idx_shared_clinic_links_clinic ON public.shared_clinic_links(clinic_id);