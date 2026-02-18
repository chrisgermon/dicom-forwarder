-- Create knowledge base tables
CREATE TABLE public.kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.kb_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.kb_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.kb_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.kb_categories(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES public.kb_subcategories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image_url TEXT,
  author_id UUID NOT NULL,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notification settings table
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_type)
);

-- Create feature flags table
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default feature flags
INSERT INTO public.feature_flags (feature_key, is_enabled, description) VALUES
  ('hardware_requests', true, 'Hardware request submissions'),
  ('toner_requests', true, 'Toner request submissions'),
  ('user_accounts', true, 'User account management'),
  ('marketing_requests', true, 'Marketing request submissions'),
  ('department_requests', true, 'Department-specific requests'),
  ('monthly_newsletter', true, 'Monthly newsletter feature'),
  ('modality_management', true, 'Modality and clinic management'),
  ('print_ordering', true, 'Print ordering forms'),
  ('front_chat', true, 'Front chat widget'),
  ('fax_campaigns', true, 'Notifyre fax campaigns'),
  ('knowledge_base', true, 'Knowledge base and documentation'),
  ('approvals', true, 'Approval workflows');

-- Enable RLS
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kb_categories
CREATE POLICY "Anyone can view active categories"
  ON public.kb_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON public.kb_categories FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for kb_subcategories
CREATE POLICY "Anyone can view active subcategories"
  ON public.kb_subcategories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subcategories"
  ON public.kb_subcategories FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for kb_pages
CREATE POLICY "Anyone can view published pages"
  ON public.kb_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all pages"
  ON public.kb_pages FOR SELECT
  USING (has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage pages"
  ON public.kb_pages FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for notification_settings
CREATE POLICY "Users can manage their own notification settings"
  ON public.notification_settings FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for feature_flags
CREATE POLICY "Anyone can view feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'super_admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_kb_categories_updated_at
  BEFORE UPDATE ON public.kb_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_subcategories_updated_at
  BEFORE UPDATE ON public.kb_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_pages_updated_at
  BEFORE UPDATE ON public.kb_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_kb_pages_category ON public.kb_pages(category_id);
CREATE INDEX idx_kb_pages_subcategory ON public.kb_pages(subcategory_id);
CREATE INDEX idx_kb_pages_published ON public.kb_pages(is_published);
CREATE INDEX idx_kb_subcategories_category ON public.kb_subcategories(category_id);
CREATE INDEX idx_notification_settings_user ON public.notification_settings(user_id);