-- Update file_documents RLS policies for shared access
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON public.file_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.file_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.file_documents;

-- Allow all authenticated users to upload documents
CREATE POLICY "Authenticated users can upload shared documents"
  ON public.file_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update documents
CREATE POLICY "Authenticated users can update shared documents"
  ON public.file_documents
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow all authenticated users to delete documents
CREATE POLICY "Authenticated users can delete shared documents"
  ON public.file_documents
  FOR DELETE
  TO authenticated
  USING (true);

-- Update storage policies for documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload to documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can access their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Allow all authenticated users to upload documents
CREATE POLICY "Authenticated users can upload to documents bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Allow all authenticated users to view documents
CREATE POLICY "Authenticated users can view documents bucket"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

-- Allow all authenticated users to update documents
CREATE POLICY "Authenticated users can update documents bucket"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents');

-- Allow all authenticated users to delete documents
CREATE POLICY "Authenticated users can delete documents bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents');