-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

-- Create policies for company assets
CREATE POLICY "Company assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-assets');

CREATE POLICY "Super admins can upload company assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'company-assets' AND has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Super admins can update company assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'company-assets' AND has_global_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Super admins can delete company assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'company-assets' AND has_global_role(auth.uid(), 'super_admin'::user_role));