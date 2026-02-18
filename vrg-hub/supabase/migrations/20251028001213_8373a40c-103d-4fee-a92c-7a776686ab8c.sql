-- Enable RLS policies for news article featured images in company-assets bucket

-- Allow authenticated users to upload news featured images
CREATE POLICY "Allow authenticated users to upload news images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'news-featured'
);

-- Allow authenticated users to update their uploaded news images
CREATE POLICY "Allow authenticated users to update news images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'news-featured'
);

-- Allow authenticated users to delete news images
CREATE POLICY "Allow authenticated users to delete news images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'news-featured'
);

-- Allow public access to view news images
CREATE POLICY "Allow public to view news images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'news-featured'
);