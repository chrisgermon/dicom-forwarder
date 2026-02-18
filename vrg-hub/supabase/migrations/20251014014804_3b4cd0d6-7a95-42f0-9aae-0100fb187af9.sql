-- Knowledge Base Ratings
CREATE TABLE IF NOT EXISTS public.knowledge_base_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.knowledge_base_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_id, user_id)
);

-- Knowledge Base Feedback
CREATE TABLE IF NOT EXISTS public.knowledge_base_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.knowledge_base_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'needs_update', 'unclear')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Knowledge Base Media (for videos, diagrams, etc.)
CREATE TABLE IF NOT EXISTS public.knowledge_base_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.knowledge_base_pages(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'image', 'diagram', 'file')),
  media_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- RLS Policies for ratings
ALTER TABLE public.knowledge_base_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings for accessible pages"
  ON public.knowledge_base_ratings FOR SELECT
  USING (
    page_id IN (
      SELECT id FROM public.knowledge_base_pages
      WHERE company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Users can create their own ratings"
  ON public.knowledge_base_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ratings"
  ON public.knowledge_base_ratings FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for feedback
ALTER TABLE public.knowledge_base_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback for accessible pages"
  ON public.knowledge_base_feedback FOR SELECT
  USING (
    page_id IN (
      SELECT id FROM public.knowledge_base_pages
      WHERE company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Users can create feedback"
  ON public.knowledge_base_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for media
ALTER TABLE public.knowledge_base_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media for accessible pages"
  ON public.knowledge_base_media FOR SELECT
  USING (
    page_id IN (
      SELECT id FROM public.knowledge_base_pages
      WHERE company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Admins can manage media"
  ON public.knowledge_base_media FOR ALL
  USING (
    page_id IN (
      SELECT id FROM public.knowledge_base_pages
      WHERE company_id = get_user_company(auth.uid())
      AND (
        has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
        has_role(auth.uid(), company_id, 'manager'::user_role) OR
        has_global_role(auth.uid(), 'super_admin'::user_role)
      )
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kb_ratings_page ON public.knowledge_base_ratings(page_id);
CREATE INDEX IF NOT EXISTS idx_kb_ratings_user ON public.knowledge_base_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_feedback_page ON public.knowledge_base_feedback(page_id);
CREATE INDEX IF NOT EXISTS idx_kb_media_page ON public.knowledge_base_media(page_id);