-- Create features table
CREATE TABLE IF NOT EXISTS public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  feature_group TEXT NOT NULL DEFAULT 'general',
  scope TEXT NOT NULL DEFAULT 'tenant' CHECK (scope IN ('platform', 'tenant')),
  is_menu_item BOOLEAN NOT NULL DEFAULT false,
  menu_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add feature_id to role_permissions (keep permission_key for backward compatibility)
ALTER TABLE public.role_permissions 
  ADD COLUMN IF NOT EXISTS feature_id UUID REFERENCES public.features(id) ON DELETE CASCADE;

-- Add feature_id and granted to user_permissions (keep permission for backward compatibility)
ALTER TABLE public.user_permissions 
  ADD COLUMN IF NOT EXISTS feature_id UUID REFERENCES public.features(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS granted BOOLEAN NOT NULL DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_features_scope ON public.features(scope);
CREATE INDEX IF NOT EXISTS idx_features_menu_item ON public.features(is_menu_item) WHERE is_menu_item = true;
CREATE INDEX IF NOT EXISTS idx_role_permissions_feature ON public.role_permissions(feature_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_feature ON public.user_permissions(feature_id);

-- Enable RLS on features table
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for features table
CREATE POLICY "Platform admins can manage all features"
  ON public.features FOR ALL
  USING (has_platform_role(auth.uid(), ARRAY['platform_admin']));

CREATE POLICY "Users can view features"
  ON public.features FOR SELECT
  USING (true);

-- Update trigger for features
CREATE TRIGGER update_features_updated_at
  BEFORE UPDATE ON public.features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial features
INSERT INTO public.features (feature_key, display_name, description, feature_group, scope, is_menu_item, menu_order) VALUES
  -- Dashboard & Basic Access
  ('view_dashboard', 'View Dashboard', 'Access to main dashboard', 'basic_access', 'tenant', true, 1),
  ('view_own_requests', 'View Own Requests', 'View requests created by user', 'basic_access', 'tenant', false, NULL),
  ('edit_own_drafts', 'Edit Own Drafts', 'Edit draft requests', 'basic_access', 'tenant', false, NULL),
  
  -- Request Creation
  ('create_hardware_request', 'Create Hardware Request', 'Submit hardware requests', 'requests', 'tenant', true, 10),
  ('create_toner_request', 'Create Toner Request', 'Submit toner requests', 'requests', 'tenant', true, 11),
  ('create_marketing_request', 'Create Marketing Request', 'Submit marketing requests', 'requests', 'tenant', true, 12),
  ('create_user_account_request', 'Create User Account Request', 'Submit user account requests', 'requests', 'tenant', true, 13),
  
  -- Approvals
  ('approve_hardware_requests', 'Approve Hardware Requests', 'Approve hardware requests', 'approvals', 'tenant', true, 20),
  ('approve_marketing_requests', 'Approve Marketing Requests', 'Approve marketing requests', 'approvals', 'tenant', true, 21),
  ('approve_user_account_requests', 'Approve User Account Requests', 'Approve user account requests', 'approvals', 'tenant', true, 22),
  ('approve_newsletter_submissions', 'Approve Newsletter Submissions', 'Approve newsletter submissions', 'approvals', 'tenant', false, NULL),
  
  -- Management
  ('manage_company_users', 'Manage Company Users', 'Manage users in company', 'management', 'tenant', true, 30),
  ('manage_hardware_catalog', 'Manage Hardware Catalog', 'Manage hardware catalog items', 'management', 'tenant', true, 31),
  ('manage_newsletter_cycle', 'Manage Newsletter Cycle', 'Manage newsletter cycles', 'management', 'tenant', true, 32),
  ('view_all_company_requests', 'View All Company Requests', 'View all requests in company', 'management', 'tenant', false, NULL),
  ('view_request_metrics', 'View Request Metrics', 'View request analytics', 'management', 'tenant', false, NULL),
  ('edit_home_page', 'Edit Home Page', 'Edit company home page', 'management', 'tenant', false, NULL),
  
  -- News Management
  ('create_news_article', 'Create News Article', 'Create news articles', 'news', 'tenant', true, 40),
  ('publish_news_article', 'Publish News Article', 'Publish news articles', 'news', 'tenant', false, NULL),
  ('delete_news_article', 'Delete News Article', 'Delete news articles', 'news', 'tenant', false, NULL),
  
  -- Configuration
  ('configure_company_settings', 'Configure Company Settings', 'Manage company settings', 'configuration', 'tenant', true, 50),
  ('manage_company_features', 'Manage Company Features', 'Toggle company features', 'configuration', 'tenant', false, NULL),
  ('manage_office365_integration', 'Manage Office 365 Integration', 'Configure Office 365', 'configuration', 'tenant', false, NULL),
  ('configure_sharepoint', 'Configure SharePoint', 'Configure SharePoint integration', 'configuration', 'tenant', false, NULL),
  
  -- Documentation
  ('view_modality_details', 'View Modality Details', 'View DICOM modality information', 'documentation', 'tenant', true, 60),
  ('view_sharepoint_documents', 'View SharePoint Documents', 'Access SharePoint documents', 'documentation', 'tenant', true, 61),
  ('submit_newsletter', 'Submit Newsletter', 'Submit newsletter content', 'documentation', 'tenant', false, NULL),
  ('manage_knowledge_base', 'Manage Knowledge Base', 'Full knowledge base management', 'documentation', 'tenant', true, 62),
  ('edit_knowledge_base', 'Edit Knowledge Base', 'Edit knowledge base articles', 'documentation', 'tenant', false, NULL),
  ('delete_knowledge_base', 'Delete Knowledge Base', 'Delete knowledge base articles', 'documentation', 'tenant', false, NULL)
ON CONFLICT (feature_key) DO NOTHING;