-- Create table to store home page shortcut links (modalities and departments)
CREATE TABLE public.home_shortcut_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shortcut_type TEXT NOT NULL CHECK (shortcut_type IN ('modality', 'department')),
  shortcut_key TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('url', 'sharepoint', 'internal')),
  link_url TEXT,
  sharepoint_path TEXT,
  internal_route TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shortcut_type, shortcut_key)
);

-- Enable RLS
ALTER TABLE public.home_shortcut_links ENABLE ROW LEVEL SECURITY;

-- Everyone can read shortcut links
CREATE POLICY "Anyone can read shortcut links"
ON public.home_shortcut_links
FOR SELECT
USING (true);

-- Only super admins can insert/update/delete
CREATE POLICY "Super admins can insert shortcut links"
ON public.home_shortcut_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rbac_user_roles ur
    JOIN rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
  )
);

CREATE POLICY "Super admins can update shortcut links"
ON public.home_shortcut_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM rbac_user_roles ur
    JOIN rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete shortcut links"
ON public.home_shortcut_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM rbac_user_roles ur
    JOIN rbac_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_home_shortcut_links_updated_at
BEFORE UPDATE ON public.home_shortcut_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();