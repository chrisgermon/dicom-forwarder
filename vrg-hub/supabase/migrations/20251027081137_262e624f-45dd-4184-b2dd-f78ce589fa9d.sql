-- Create storage bucket for fax documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('fax-documents', 'fax-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for fax documents bucket
CREATE POLICY "Authenticated users can upload fax documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fax-documents');

CREATE POLICY "Authenticated users can read fax documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'fax-documents');

CREATE POLICY "Authenticated users can update their fax documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'fax-documents');

CREATE POLICY "Authenticated users can delete fax documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'fax-documents');