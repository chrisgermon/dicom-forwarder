-- Allow authenticated users to upload to company-assets bucket
CREATE POLICY "Allow authenticated uploads to company-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- Allow authenticated users to update files in company-assets bucket
CREATE POLICY "Allow authenticated updates to company-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets');

-- Allow public read access to company-assets bucket
CREATE POLICY "Allow public reads from company-assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-assets');