-- Create requests tables for single-tenant mode

-- Hardware requests table
CREATE TABLE IF NOT EXISTS public.hardware_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  business_justification TEXT NOT NULL,
  clinic_name TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  expected_delivery_date TIMESTAMPTZ,
  manager_id UUID REFERENCES auth.users(id),
  manager_approved_at TIMESTAMPTZ,
  manager_approval_notes TEXT,
  admin_id UUID REFERENCES auth.users(id),
  admin_approved_at TIMESTAMPTZ,
  admin_approval_notes TEXT,
  declined_by UUID REFERENCES auth.users(id),
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request items table
CREATE TABLE IF NOT EXISTS public.request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.hardware_requests(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  vendor TEXT,
  model_number TEXT,
  specifications JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request attachments table  
CREATE TABLE IF NOT EXISTS public.request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.hardware_requests(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  attachment_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request status history table
CREATE TABLE IF NOT EXISTS public.request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.hardware_requests(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- News articles table
CREATE TABLE IF NOT EXISTS public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  published_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT FALSE,
  featured_image_url TEXT,
  slug TEXT UNIQUE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.hardware_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hardware_requests
CREATE POLICY "Users can view their own requests"
  ON public.hardware_requests FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create their own requests"
  ON public.hardware_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft requests"
  ON public.hardware_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers and admins can update requests"
  ON public.hardware_requests FOR UPDATE
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for request_items
CREATE POLICY "Users can view items for visible requests"
  ON public.request_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hardware_requests 
      WHERE id = request_id 
      AND (user_id = auth.uid() OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Users can manage items for their own requests"
  ON public.request_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.hardware_requests 
      WHERE id = request_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for request_attachments
CREATE POLICY "Users can view attachments for visible requests"
  ON public.request_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hardware_requests 
      WHERE id = request_id 
      AND (user_id = auth.uid() OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Users can manage attachments for their own requests"
  ON public.request_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.hardware_requests 
      WHERE id = request_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for request_status_history
CREATE POLICY "Users can view status history for visible requests"
  ON public.request_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hardware_requests 
      WHERE id = request_id 
      AND (user_id = auth.uid() OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Managers and admins can create status history"
  ON public.request_status_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for news_articles
CREATE POLICY "Anyone can view published articles"
  ON public.news_articles FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all articles"
  ON public.news_articles FOR SELECT
  USING (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage articles"
  ON public.news_articles FOR ALL
  USING (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hardware_requests_updated_at BEFORE UPDATE ON public.hardware_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON public.news_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();