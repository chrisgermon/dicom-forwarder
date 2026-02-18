-- Create storage bucket for request attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload request attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'request-attachments');

-- Allow users to view their own request attachments
CREATE POLICY "Users can view request attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'request-attachments');

-- Allow users to delete their own request attachments
CREATE POLICY "Users can delete request attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'request-attachments');