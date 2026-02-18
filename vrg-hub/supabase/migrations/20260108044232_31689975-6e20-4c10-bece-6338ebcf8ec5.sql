-- Create table for modality and department page content
CREATE TABLE public.modality_department_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_type TEXT NOT NULL CHECK (page_type IN ('modality', 'department')),
  page_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  icon TEXT,
  gradient TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(page_type, page_key)
);

-- Enable RLS
ALTER TABLE public.modality_department_pages ENABLE ROW LEVEL SECURITY;

-- Everyone can view pages
CREATE POLICY "Anyone can view modality_department_pages"
ON public.modality_department_pages
FOR SELECT
USING (true);

-- Only super_admins can insert
CREATE POLICY "Super admins can insert modality_department_pages"
ON public.modality_department_pages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Only super_admins can update
CREATE POLICY "Super admins can update modality_department_pages"
ON public.modality_department_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Only super_admins can delete
CREATE POLICY "Super admins can delete modality_department_pages"
ON public.modality_department_pages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_modality_department_pages_updated_at
BEFORE UPDATE ON public.modality_department_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial pages for modalities
INSERT INTO public.modality_department_pages (page_type, page_key, title, icon, gradient)
VALUES
  ('modality', 'xray', 'X-Ray', 'Scan', 'from-blue-500 to-blue-600'),
  ('modality', 'ct', 'CT', 'Activity', 'from-purple-500 to-purple-600'),
  ('modality', 'ultrasound', 'Ultrasound', 'Heart', 'from-pink-500 to-rose-500'),
  ('modality', 'mri', 'MRI', 'Brain', 'from-indigo-500 to-indigo-600'),
  ('modality', 'mammography', 'Mammography', 'Microscope', 'from-teal-500 to-cyan-500'),
  ('modality', 'eos', 'EOS', 'Bone', 'from-amber-500 to-orange-500'),
  ('department', 'reception', 'Reception', 'Building2', 'from-emerald-500 to-green-600'),
  ('department', 'medical', 'Medical', 'Users', 'from-sky-500 to-blue-600'),
  ('department', 'marketing', 'Marketing', 'Megaphone', 'from-orange-500 to-red-500'),
  ('department', 'hr', 'HR', 'Briefcase', 'from-violet-500 to-purple-600'),
  ('department', 'finance', 'Finance', 'DollarSign', 'from-lime-500 to-green-500');