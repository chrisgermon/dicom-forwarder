-- Create menu configurations table
CREATE TABLE public.menu_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  item_key TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('common', 'category', 'item', 'admin', 'settings', 'help')),
  parent_key TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, item_key)
);

-- Enable RLS
ALTER TABLE public.menu_configurations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all menu configurations
CREATE POLICY "Super admins can manage menu configs"
ON public.menu_configurations
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Tenant admins can manage their company's menu configs
CREATE POLICY "Tenant admins can view menu configs"
ON public.menu_configurations
FOR SELECT
USING (has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role));

-- All authenticated users can view menu configs for their role
CREATE POLICY "Users can view their role menu configs"
ON public.menu_configurations
FOR SELECT
USING (
  role IN (
    SELECT ur.role 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE TRIGGER update_menu_configurations_updated_at
BEFORE UPDATE ON public.menu_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();