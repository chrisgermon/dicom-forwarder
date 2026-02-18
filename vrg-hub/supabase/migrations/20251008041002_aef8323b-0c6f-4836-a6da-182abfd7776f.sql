-- Create storage bucket for fax documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('fax-documents', 'fax-documents', false);

-- Create RLS policies for fax documents bucket
CREATE POLICY "Authenticated users can view their company's fax documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fax-documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "System can insert fax documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fax-documents' AND
  auth.role() = 'authenticated'
);

-- Add document_path column to notifyre_fax_logs if it doesn't exist
ALTER TABLE notifyre_fax_logs 
ADD COLUMN IF NOT EXISTS document_path text;