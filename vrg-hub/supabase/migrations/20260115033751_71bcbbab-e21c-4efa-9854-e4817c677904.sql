-- =============================================
-- EMPLOYEE ONBOARDING SYSTEM
-- =============================================

-- Onboarding templates (reusable checklists for different roles/departments)
CREATE TABLE public.onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  brand_id UUID REFERENCES public.brands(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Onboarding template items (individual tasks within a template)
CREATE TABLE public.onboarding_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general', -- day1, week1, month1, month3
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  due_days INTEGER DEFAULT 0, -- Days from start date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee onboarding journeys (assigned to new employees)
CREATE TABLE public.onboarding_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.onboarding_templates(id),
  manager_id UUID,
  mentor_id UUID,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_completion_date DATE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold')),
  completion_percentage INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Onboarding task completions
CREATE TABLE public.onboarding_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.onboarding_journeys(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES public.onboarding_template_items(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  due_date DATE,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Onboarding milestones (30/60/90 day check-ins)
CREATE TABLE public.onboarding_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.onboarding_journeys(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('day_30', 'day_60', 'day_90', 'custom')),
  title TEXT NOT NULL,
  scheduled_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  manager_notes TEXT,
  employee_feedback TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'skipped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- SURVEYS & POLLS SYSTEM
-- =============================================

-- Survey/Poll definitions
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  survey_type TEXT NOT NULL CHECK (survey_type IN ('pulse', 'poll', 'feedback', 'engagement')),
  is_anonymous BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  target_audience TEXT DEFAULT 'all', -- all, department, brand, role
  target_filter JSONB, -- Filter criteria for targeting
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Survey questions
CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'scale', 'text', 'rating')),
  options JSONB, -- For choice questions: ["Option 1", "Option 2"]
  scale_min INTEGER DEFAULT 1,
  scale_max INTEGER DEFAULT 5,
  scale_labels JSONB, -- {"1": "Strongly Disagree", "5": "Strongly Agree"}
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Survey responses
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id UUID, -- NULL if anonymous
  anonymous_id TEXT, -- For anonymous responses
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_complete BOOLEAN DEFAULT false
);

-- Individual question answers
CREATE TABLE public.survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_choice TEXT,
  answer_choices TEXT[],
  answer_scale INTEGER,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Engagement scores (aggregated over time)
CREATE TABLE public.engagement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  department TEXT,
  brand_id UUID REFERENCES public.brands(id),
  location_id UUID REFERENCES public.locations(id),
  score DECIMAL(5,2),
  response_rate DECIMAL(5,2),
  total_responses INTEGER DEFAULT 0,
  metrics JSONB, -- Breakdown by question category
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- MANAGER DASHBOARD VIEWS (Materialized for performance)
-- =============================================

-- Team metrics snapshot
CREATE TABLE public.team_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  open_requests INTEGER DEFAULT 0,
  pending_approvals INTEGER DEFAULT 0,
  overdue_items INTEGER DEFAULT 0,
  checklist_completion_rate DECIMAL(5,2),
  team_size INTEGER DEFAULT 0,
  avg_resolution_days DECIMAL(5,2),
  metrics_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(manager_id, metric_date)
);

-- =============================================
-- OFFLINE FORM DRAFTS
-- =============================================

CREATE TABLE public.offline_form_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  form_type TEXT NOT NULL,
  form_data JSONB NOT NULL,
  device_id TEXT,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- PUSH NOTIFICATION SUBSCRIPTIONS
-- =============================================

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_form_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Onboarding templates: Admins can manage, others can read active
CREATE POLICY "Anyone can view active onboarding templates" ON public.onboarding_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage onboarding templates" ON public.onboarding_templates FOR ALL USING (true);

CREATE POLICY "Anyone can view template items" ON public.onboarding_template_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage template items" ON public.onboarding_template_items FOR ALL USING (true);

-- Onboarding journeys: Users see their own, managers see team
CREATE POLICY "Users can view own onboarding journey" ON public.onboarding_journeys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Managers can view team journeys" ON public.onboarding_journeys FOR SELECT USING (auth.uid() = manager_id);
CREATE POLICY "Admins can manage all journeys" ON public.onboarding_journeys FOR ALL USING (true);

CREATE POLICY "Users can view own task completions" ON public.onboarding_task_completions FOR SELECT USING (
  journey_id IN (SELECT id FROM public.onboarding_journeys WHERE user_id = auth.uid() OR manager_id = auth.uid())
);
CREATE POLICY "Users can update own tasks" ON public.onboarding_task_completions FOR UPDATE USING (
  journey_id IN (SELECT id FROM public.onboarding_journeys WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage all task completions" ON public.onboarding_task_completions FOR ALL USING (true);

CREATE POLICY "Users can view own milestones" ON public.onboarding_milestones FOR SELECT USING (
  journey_id IN (SELECT id FROM public.onboarding_journeys WHERE user_id = auth.uid() OR manager_id = auth.uid())
);
CREATE POLICY "Admins can manage milestones" ON public.onboarding_milestones FOR ALL USING (true);

-- Surveys: Active surveys visible to all authenticated users
CREATE POLICY "Authenticated users can view active surveys" ON public.surveys FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage surveys" ON public.surveys FOR ALL USING (true);

CREATE POLICY "Anyone can view survey questions" ON public.survey_questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage questions" ON public.survey_questions FOR ALL USING (true);

-- Survey responses: Users see own (unless anonymous), admins see all
CREATE POLICY "Users can view own responses" ON public.survey_responses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can submit responses" ON public.survey_responses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can view all responses" ON public.survey_responses FOR SELECT USING (true);

CREATE POLICY "Users can submit answers" ON public.survey_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own answers" ON public.survey_answers FOR SELECT USING (
  response_id IN (SELECT id FROM public.survey_responses WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can view all answers" ON public.survey_answers FOR SELECT USING (true);

-- Engagement scores: Visible to managers and admins
CREATE POLICY "Managers can view engagement scores" ON public.engagement_scores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage engagement scores" ON public.engagement_scores FOR ALL USING (true);

-- Team metrics: Managers see their own team metrics
CREATE POLICY "Managers can view own team metrics" ON public.team_metrics FOR SELECT USING (manager_id = auth.uid());
CREATE POLICY "Admins can manage team metrics" ON public.team_metrics FOR ALL USING (true);

-- Offline drafts: Users only see their own
CREATE POLICY "Users can manage own drafts" ON public.offline_form_drafts FOR ALL USING (user_id = auth.uid());

-- Push subscriptions: Users manage their own
CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions FOR ALL USING (user_id = auth.uid());

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_onboarding_journeys_user ON public.onboarding_journeys(user_id);
CREATE INDEX idx_onboarding_journeys_manager ON public.onboarding_journeys(manager_id);
CREATE INDEX idx_onboarding_journeys_status ON public.onboarding_journeys(status);
CREATE INDEX idx_onboarding_task_completions_journey ON public.onboarding_task_completions(journey_id);
CREATE INDEX idx_surveys_active ON public.surveys(is_active, starts_at, ends_at);
CREATE INDEX idx_survey_responses_survey ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_user ON public.survey_responses(user_id);
CREATE INDEX idx_team_metrics_manager_date ON public.team_metrics(manager_id, metric_date);
CREATE INDEX idx_offline_drafts_user ON public.offline_form_drafts(user_id);
CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- =============================================
-- FUNCTION TO CALCULATE ONBOARDING PROGRESS
-- =============================================

CREATE OR REPLACE FUNCTION public.calculate_onboarding_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.onboarding_journeys
  SET 
    completion_percentage = (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE is_completed = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100
        ), 0
      )
      FROM public.onboarding_task_completions
      WHERE journey_id = NEW.journey_id
    ),
    status = CASE 
      WHEN (
        SELECT COUNT(*) FILTER (WHERE is_completed = false)
        FROM public.onboarding_task_completions
        WHERE journey_id = NEW.journey_id
      ) = 0 THEN 'completed'
      ELSE 'in_progress'
    END,
    updated_at = now()
  WHERE id = NEW.journey_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_onboarding_progress
AFTER INSERT OR UPDATE ON public.onboarding_task_completions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_onboarding_progress();