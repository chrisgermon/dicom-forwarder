-- Create a table for storing roster file uploads per brand
CREATE TABLE public.roster_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  roster_type TEXT NOT NULL CHECK (roster_type IN ('radiologist', 'staff')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, roster_type)
);

-- Enable Row Level Security
ALTER TABLE public.roster_files ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to view roster files
CREATE POLICY "Authenticated users can view roster files" 
ON public.roster_files 
FOR SELECT 
TO authenticated
USING (true);

-- Create policy for authenticated users to insert roster files
CREATE POLICY "Authenticated users can insert roster files" 
ON public.roster_files 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create policy for authenticated users to update roster files
CREATE POLICY "Authenticated users can update roster files" 
ON public.roster_files 
FOR UPDATE 
TO authenticated
USING (true);

-- Create policy for authenticated users to delete roster files
CREATE POLICY "Authenticated users can delete roster files" 
ON public.roster_files 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_roster_files_updated_at
BEFORE UPDATE ON public.roster_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for roster files
INSERT INTO storage.buckets (id, name, public) VALUES ('roster-files', 'roster-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for roster files bucket
CREATE POLICY "Authenticated users can view roster files storage"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'roster-files');

CREATE POLICY "Authenticated users can upload roster files storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'roster-files');

CREATE POLICY "Authenticated users can update roster files storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'roster-files');

CREATE POLICY "Authenticated users can delete roster files storage"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'roster-files');