-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Create storage policies for brand logos
CREATE POLICY "Public can view brand logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = 'brand-logos');

CREATE POLICY "Authenticated users can upload brand logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'brand-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update brand logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'brand-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete brand logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'brand-logos'
  AND auth.role() = 'authenticated'
);