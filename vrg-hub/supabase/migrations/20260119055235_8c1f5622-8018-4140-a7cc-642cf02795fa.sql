-- MLO Contacts: Detailed contact profiles for clinics/referrers
CREATE TABLE public.mlo_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clinic_key INTEGER,
  referrer_key INTEGER,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('clinic', 'referrer', 'practice_manager', 'other')),
  first_name TEXT NOT NULL,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'mobile', 'in_person')),
  notes TEXT,
  tags TEXT[],
  birthday DATE,
  interests TEXT[],
  is_key_decision_maker BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- MLO Communication Logs: Track all interactions
CREATE TABLE public.mlo_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.mlo_contacts(id) ON DELETE CASCADE,
  clinic_key INTEGER,
  referrer_key INTEGER,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'phone_call', 'meeting', 'video_call', 'text', 'linkedin', 'other')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  summary TEXT NOT NULL,
  detailed_notes TEXT,
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'follow_up_needed', 'no_response')),
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT false,
  duration_minutes INTEGER,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- MLO Relationship Health Scores
CREATE TABLE public.mlo_relationship_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clinic_key INTEGER,
  referrer_key INTEGER,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
  satisfaction_score INTEGER CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
  referral_trend TEXT CHECK (referral_trend IN ('increasing', 'stable', 'decreasing', 'new')),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  last_visit_date DATE,
  days_since_last_contact INTEGER,
  total_referrals_ytd INTEGER DEFAULT 0,
  notes TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, clinic_key),
  UNIQUE(user_id, referrer_key)
);

-- MLO Tasks: Follow-ups and to-dos
CREATE TABLE public.mlo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.mlo_contacts(id) ON DELETE SET NULL,
  clinic_key INTEGER,
  referrer_key INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('follow_up', 'meeting', 'call', 'email', 'research', 'presentation', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')),
  due_date DATE,
  due_time TIME,
  completed_at TIMESTAMPTZ,
  reminder_date TIMESTAMPTZ,
  recurrence TEXT CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'quarterly')),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- MLO Referral Pipeline: Track referral opportunities
CREATE TABLE public.mlo_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clinic_key INTEGER,
  referrer_key INTEGER,
  contact_id UUID REFERENCES public.mlo_contacts(id) ON DELETE SET NULL,
  opportunity_name TEXT NOT NULL,
  description TEXT,
  stage TEXT NOT NULL DEFAULT 'prospecting' CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  expected_monthly_referrals INTEGER,
  expected_revenue DECIMAL(12,2),
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,
  win_reason TEXT,
  loss_reason TEXT,
  competitor TEXT,
  next_action TEXT,
  next_action_date DATE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- MLO Activity Feed: Aggregated activity for dashboard
CREATE TABLE public.mlo_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('visit', 'communication', 'task_completed', 'pipeline_update', 'contact_added', 'relationship_change')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('visit', 'communication', 'task', 'pipeline', 'contact', 'relationship')),
  entity_id UUID NOT NULL,
  clinic_key INTEGER,
  referrer_key INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.mlo_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlo_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlo_relationship_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlo_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlo_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlo_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mlo_contacts
CREATE POLICY "Users can view own contacts" ON public.mlo_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Managers can view all contacts" ON public.mlo_contacts FOR SELECT USING (public.is_mlo_manager(auth.uid()));
CREATE POLICY "Users can create own contacts" ON public.mlo_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.mlo_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Managers can update all contacts" ON public.mlo_contacts FOR UPDATE USING (public.is_mlo_manager(auth.uid()));
CREATE POLICY "Users can delete own contacts" ON public.mlo_contacts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mlo_communications
CREATE POLICY "Users can view own communications" ON public.mlo_communications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Managers can view all communications" ON public.mlo_communications FOR SELECT USING (public.is_mlo_manager(auth.uid()));
CREATE POLICY "Users can create own communications" ON public.mlo_communications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own communications" ON public.mlo_communications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Managers can update all communications" ON public.mlo_communications FOR UPDATE USING (public.is_mlo_manager(auth.uid()));
CREATE POLICY "Users can delete own communications" ON public.mlo_communications FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mlo_relationship_scores
CREATE POLICY "Users can view own scores" ON public.mlo_relationship_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Managers can view all scores" ON public.mlo_relationship_scores FOR SELECT USING (public.is_mlo_manager(auth.uid()));
CREATE POLICY "Users can create own scores" ON public.mlo_relationship_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scores" ON public.mlo_relationship_scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Managers can update all scores" ON public.mlo_relationship_scores FOR UPDATE USING (public.is_mlo_manager(auth.uid()));

-- RLS Policies for mlo_tasks
CREATE POLICY "Users can view own tasks" ON public.mlo_tasks FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_to);
CREATE POLICY "Managers can view all tasks" ON public.mlo_tasks FOR SELECT USING (public.is_mlo_manager(auth.uid()));
CREATE POLICY "Users can create tasks" ON public.mlo_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.mlo_tasks FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = assigned_to);
CREATE POLICY "Managers can update all tasks" ON public.mlo_tasks FOR UPDATE USING (public.is_mlo_manager(auth.uid()));
CREATE POLICY "Users can delete own tasks" ON public.mlo_tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mlo_pipeline
CREATE POLICY "Users can view own pipeline" ON public.mlo_pipeline FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Managers can view all pipeline" ON public.mlo_pipeline FOR SELECT USING (public.is_mlo_manager(auth.uid()));
CREATE POLICY "Users can create pipeline" ON public.mlo_pipeline FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pipeline" ON public.mlo_pipeline FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Managers can update all pipeline" ON public.mlo_pipeline FOR UPDATE USING (public.is_mlo_manager(auth.uid()));
CREATE POLICY "Users can delete own pipeline" ON public.mlo_pipeline FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mlo_activities
CREATE POLICY "Users can view own activities" ON public.mlo_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Managers can view all activities" ON public.mlo_activities FOR SELECT USING (public.is_mlo_manager(auth.uid()));
CREATE POLICY "Users can create activities" ON public.mlo_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_mlo_contacts_user_id ON public.mlo_contacts(user_id);
CREATE INDEX idx_mlo_contacts_clinic_key ON public.mlo_contacts(clinic_key);
CREATE INDEX idx_mlo_contacts_referrer_key ON public.mlo_contacts(referrer_key);
CREATE INDEX idx_mlo_communications_user_id ON public.mlo_communications(user_id);
CREATE INDEX idx_mlo_communications_contact_id ON public.mlo_communications(contact_id);
CREATE INDEX idx_mlo_communications_created_at ON public.mlo_communications(created_at DESC);
CREATE INDEX idx_mlo_tasks_user_id ON public.mlo_tasks(user_id);
CREATE INDEX idx_mlo_tasks_due_date ON public.mlo_tasks(due_date);
CREATE INDEX idx_mlo_tasks_status ON public.mlo_tasks(status);
CREATE INDEX idx_mlo_pipeline_user_id ON public.mlo_pipeline(user_id);
CREATE INDEX idx_mlo_pipeline_stage ON public.mlo_pipeline(stage);
CREATE INDEX idx_mlo_activities_user_id ON public.mlo_activities(user_id);
CREATE INDEX idx_mlo_activities_created_at ON public.mlo_activities(created_at DESC);
CREATE INDEX idx_mlo_relationship_scores_user_id ON public.mlo_relationship_scores(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_mlo_contacts_updated_at BEFORE UPDATE ON public.mlo_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mlo_communications_updated_at BEFORE UPDATE ON public.mlo_communications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mlo_relationship_scores_updated_at BEFORE UPDATE ON public.mlo_relationship_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mlo_tasks_updated_at BEFORE UPDATE ON public.mlo_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mlo_pipeline_updated_at BEFORE UPDATE ON public.mlo_pipeline FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();