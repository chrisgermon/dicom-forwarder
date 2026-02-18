-- Create table for shareable modality links
CREATE TABLE IF NOT EXISTS public.shareable_modality_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modality_id UUID NOT NULL REFERENCES public.modalities(id) ON DELETE CASCADE,
  encrypted_token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.shareable_modality_links ENABLE ROW LEVEL SECURITY;

-- Admins can manage shareable links
CREATE POLICY "Admins can manage shareable links"
ON public.shareable_modality_links
FOR ALL
USING (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone can view active links (for public sharing)
CREATE POLICY "Anyone can view active shareable links"
ON public.shareable_modality_links
FOR SELECT
USING (is_active = true);

-- Add index for faster lookups
CREATE INDEX idx_shareable_links_token ON public.shareable_modality_links(encrypted_token);
CREATE INDEX idx_shareable_links_modality ON public.shareable_modality_links(modality_id);