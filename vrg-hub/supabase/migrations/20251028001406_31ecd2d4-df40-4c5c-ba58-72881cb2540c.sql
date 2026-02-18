-- Enable RLS policies for news article content images in company-assets bucket

-- Allow authenticated users to upload news content images
CREATE POLICY "Allow authenticated users to upload news content images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'news-images'
);

-- Allow authenticated users to update their uploaded news content images
CREATE POLICY "Allow authenticated users to update news content images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'news-images'
);

-- Allow authenticated users to delete news content images
CREATE POLICY "Allow authenticated users to delete news content images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'news-images'
);

-- Allow public access to view news content images
CREATE POLICY "Allow public to view news content images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'company-assets' 
  AND (storage.foldername(name))[1] = 'news-images'
);