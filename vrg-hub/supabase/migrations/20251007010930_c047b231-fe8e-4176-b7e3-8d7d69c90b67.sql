-- Create knowledge base workspace table
CREATE TABLE IF NOT EXISTS public.knowledge_base_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- Create knowledge base pages table
CREATE TABLE IF NOT EXISTS public.knowledge_base_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.knowledge_base_workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.knowledge_base_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{"type": "doc", "content": []}'::jsonb,
  icon TEXT,
  cover_image TEXT,
  view_mode TEXT NOT NULL DEFAULT 'page', -- page, whiteboard, table
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  is_template BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Create page versions table for history
CREATE TABLE IF NOT EXISTS public.knowledge_base_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.knowledge_base_pages(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  title TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_summary TEXT
);

-- Create tags table
CREATE TABLE IF NOT EXISTS public.knowledge_base_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Create page tags junction table
CREATE TABLE IF NOT EXISTS public.knowledge_base_page_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.knowledge_base_pages(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.knowledge_base_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_id, tag_id)
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.knowledge_base_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  page_id UUID NOT NULL REFERENCES public.knowledge_base_pages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_id)
);

-- Create page shares table
CREATE TABLE IF NOT EXISTS public.knowledge_base_page_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.knowledge_base_pages(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  share_token UUID NOT NULL DEFAULT gen_random_uuid(),
  access_level TEXT NOT NULL DEFAULT 'view', -- view, comment, edit
  expires_at TIMESTAMP WITH TIME ZONE,
  password_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(share_token)
);

-- Create page comments table
CREATE TABLE IF NOT EXISTS public.knowledge_base_page_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.knowledge_base_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.knowledge_base_page_comments(id) ON DELETE CASCADE,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kb_pages_workspace ON public.knowledge_base_pages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_kb_pages_parent ON public.knowledge_base_pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_kb_pages_company ON public.knowledge_base_pages(company_id);
CREATE INDEX IF NOT EXISTS idx_kb_page_versions_page ON public.knowledge_base_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_kb_page_tags_page ON public.knowledge_base_page_tags(page_id);
CREATE INDEX IF NOT EXISTS idx_kb_page_tags_tag ON public.knowledge_base_page_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_kb_favorites_user ON public.knowledge_base_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_comments_page ON public.knowledge_base_page_comments(page_id);

-- Enable RLS
ALTER TABLE public.knowledge_base_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_page_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_page_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_page_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view their company workspaces"
  ON public.knowledge_base_workspaces FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage workspaces"
  ON public.knowledge_base_workspaces FOR ALL
  USING (
    (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
    OR has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- RLS Policies for pages
CREATE POLICY "Users can view their company pages"
  ON public.knowledge_base_pages FOR SELECT
  USING (company_id = get_user_company(auth.uid()) AND is_archived = false);

CREATE POLICY "Users can create pages"
  ON public.knowledge_base_pages FOR INSERT
  WITH CHECK (
    company_id = get_user_company(auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can update their own pages"
  ON public.knowledge_base_pages FOR UPDATE
  USING (
    (created_by = auth.uid() OR 
    has_role(auth.uid(), company_id, 'manager'::user_role) OR
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role))
    AND company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Admins can delete pages"
  ON public.knowledge_base_pages FOR DELETE
  USING (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_global_role(auth.uid(), 'super_admin'::user_role)
  );

-- RLS Policies for versions
CREATE POLICY "Users can view page versions"
  ON public.knowledge_base_page_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_base_pages
      WHERE id = page_id AND company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "System can create versions"
  ON public.knowledge_base_page_versions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for tags
CREATE POLICY "Users can view company tags"
  ON public.knowledge_base_tags FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can create tags"
  ON public.knowledge_base_tags FOR INSERT
  WITH CHECK (company_id = get_user_company(auth.uid()));

-- RLS Policies for page tags
CREATE POLICY "Users can view page tags"
  ON public.knowledge_base_page_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_base_pages
      WHERE id = page_id AND company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Users can manage page tags"
  ON public.knowledge_base_page_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_base_pages
      WHERE id = page_id AND company_id = get_user_company(auth.uid())
    )
  );

-- RLS Policies for favorites
CREATE POLICY "Users can manage their own favorites"
  ON public.knowledge_base_favorites FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for shares
CREATE POLICY "Users can view shares for their pages"
  ON public.knowledge_base_page_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_base_pages
      WHERE id = page_id AND company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Page owners can create shares"
  ON public.knowledge_base_page_shares FOR INSERT
  WITH CHECK (
    shared_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.knowledge_base_pages
      WHERE id = page_id AND company_id = get_user_company(auth.uid())
    )
  );

-- RLS Policies for comments
CREATE POLICY "Users can view comments on their company pages"
  ON public.knowledge_base_page_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_base_pages
      WHERE id = page_id AND company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Users can create comments"
  ON public.knowledge_base_page_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.knowledge_base_pages
      WHERE id = page_id AND company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.knowledge_base_page_comments FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_kb_workspaces_updated_at
  BEFORE UPDATE ON public.knowledge_base_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_pages_updated_at
  BEFORE UPDATE ON public.knowledge_base_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_comments_updated_at
  BEFORE UPDATE ON public.knowledge_base_page_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create page version on update
CREATE OR REPLACE FUNCTION public.create_page_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM public.knowledge_base_page_versions
    WHERE page_id = NEW.id;
    
    INSERT INTO public.knowledge_base_page_versions (
      page_id,
      content,
      title,
      version_number,
      created_by
    ) VALUES (
      NEW.id,
      OLD.content,
      OLD.title,
      next_version,
      auth.uid()
    );
  END IF;
  
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_kb_page_version
  BEFORE UPDATE ON public.knowledge_base_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_page_version();