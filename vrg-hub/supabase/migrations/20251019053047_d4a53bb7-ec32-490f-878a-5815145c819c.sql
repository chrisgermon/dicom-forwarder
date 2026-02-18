-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create request_types table
CREATE TABLE public.request_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(department_id, name)
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_in_team TEXT CHECK (role_in_team IN ('member', 'lead')) DEFAULT 'member',
  workload_capacity INTEGER DEFAULT 5,
  out_of_office_from DATE,
  out_of_office_to DATE,
  timezone TEXT,
  skills TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create routing_rules table
CREATE TABLE public.routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type_id UUID REFERENCES public.request_types(id) ON DELETE CASCADE NOT NULL,
  strategy TEXT CHECK (strategy IN (
    'default_assignee',
    'round_robin',
    'load_balance',
    'team_lead_first',
    'skill_based',
    'fallback_to_department'
  )) NOT NULL,
  default_assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  skills TEXT[],
  is_active BOOLEAN DEFAULT true,
  priority SMALLINT DEFAULT 100,
  json_rules JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(request_type_id, priority)
);

-- Create tickets table (unified)
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type_id UUID REFERENCES public.request_types(id) NOT NULL,
  status TEXT CHECK (status IN (
    'new',
    'in_progress',
    'waiting',
    'resolved',
    'closed',
    'cancelled'
  )) DEFAULT 'new',
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  subject TEXT NOT NULL,
  description TEXT,
  reference_code TEXT UNIQUE NOT NULL,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  due_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ticket_events table
CREATE TABLE public.ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN (
    'created',
    'assigned',
    'reassigned',
    'commented',
    'status_changed',
    'priority_changed',
    'escalated',
    'closed'
  )) NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ticket_comments table
CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ticket_watchers table
CREATE TABLE public.ticket_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  added_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

-- Create escalation_policies table
CREATE TABLE public.escalation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  applies_to_request_type_id UUID REFERENCES public.request_types(id) ON DELETE CASCADE,
  applies_to_department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  levels JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_notifications table
CREATE TABLE public.email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_notification_prefs table
CREATE TABLE public.user_notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel TEXT CHECK (channel IN ('email', 'in_app')) DEFAULT 'email',
  events JSONB DEFAULT '{}',
  digest TEXT CHECK (digest IN ('off', 'hourly', 'daily')) DEFAULT 'off',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, channel)
);

-- Create indexes
CREATE INDEX idx_tickets_requester ON public.tickets(requester_user_id);
CREATE INDEX idx_tickets_assigned_user ON public.tickets(assigned_user_id);
CREATE INDEX idx_tickets_assigned_team ON public.tickets(assigned_team_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_reference ON public.tickets(reference_code);
CREATE INDEX idx_ticket_events_ticket ON public.ticket_events(ticket_id);
CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);
CREATE INDEX idx_ticket_watchers_ticket ON public.ticket_watchers(ticket_id);
CREATE INDEX idx_ticket_watchers_user ON public.ticket_watchers(user_id);
CREATE INDEX idx_routing_rules_type ON public.routing_rules(request_type_id);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);

-- Create GIN indexes for JSONB
CREATE INDEX idx_tickets_metadata_gin ON public.tickets USING GIN(metadata);
CREATE INDEX idx_routing_rules_json_gin ON public.routing_rules USING GIN(json_rules);
CREATE INDEX idx_escalation_levels_gin ON public.escalation_policies USING GIN(levels);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_prefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Everyone can view active departments"
  ON public.departments FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

-- RLS Policies for request_types
CREATE POLICY "Everyone can view active request types"
  ON public.request_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage request types"
  ON public.request_types FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

-- RLS Policies for teams
CREATE POLICY "Everyone can view active teams"
  ON public.teams FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

-- RLS Policies for team_members
CREATE POLICY "Everyone can view team members"
  ON public.team_members FOR SELECT
  USING (true);

CREATE POLICY "Admins and team leads can manage team members"
  ON public.team_members FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role_in_team = 'lead'
    )
  );

-- RLS Policies for routing_rules
CREATE POLICY "Everyone can view active routing rules"
  ON public.routing_rules FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage routing rules"
  ON public.routing_rules FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

-- RLS Policies for tickets
CREATE POLICY "Users can view their own tickets or assigned tickets"
  ON public.tickets FOR SELECT
  USING (
    requester_user_id = auth.uid() OR
    assigned_user_id = auth.uid() OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.ticket_watchers
      WHERE ticket_watchers.ticket_id = tickets.id
        AND ticket_watchers.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = tickets.assigned_team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "Assigned users and admins can update tickets"
  ON public.tickets FOR UPDATE
  USING (
    assigned_user_id = auth.uid() OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = tickets.assigned_team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role_in_team = 'lead'
    )
  );

-- RLS Policies for ticket_events
CREATE POLICY "Users can view events for visible tickets"
  ON public.ticket_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_events.ticket_id
        AND (
          tickets.requester_user_id = auth.uid() OR
          tickets.assigned_user_id = auth.uid() OR
          has_role(auth.uid(), 'manager'::app_role) OR
          has_role(auth.uid(), 'tenant_admin'::app_role) OR
          has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );

CREATE POLICY "System can insert ticket events"
  ON public.ticket_events FOR INSERT
  WITH CHECK (true);

-- RLS Policies for ticket_comments
CREATE POLICY "Users can view comments on visible tickets"
  ON public.ticket_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
        AND (
          tickets.requester_user_id = auth.uid() OR
          tickets.assigned_user_id = auth.uid() OR
          has_role(auth.uid(), 'manager'::app_role) OR
          has_role(auth.uid(), 'tenant_admin'::app_role) OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          EXISTS (
            SELECT 1 FROM public.ticket_watchers
            WHERE ticket_watchers.ticket_id = tickets.id
              AND ticket_watchers.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Users can comment on tickets they can see"
  ON public.ticket_comments FOR INSERT
  WITH CHECK (
    author_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
        AND (
          tickets.requester_user_id = auth.uid() OR
          tickets.assigned_user_id = auth.uid() OR
          has_role(auth.uid(), 'manager'::app_role) OR
          has_role(auth.uid(), 'tenant_admin'::app_role) OR
          has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );

-- RLS Policies for ticket_watchers
CREATE POLICY "Users can view watchers on visible tickets"
  ON public.ticket_watchers FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_watchers.ticket_id
        AND (
          tickets.requester_user_id = auth.uid() OR
          tickets.assigned_user_id = auth.uid() OR
          has_role(auth.uid(), 'manager'::app_role) OR
          has_role(auth.uid(), 'tenant_admin'::app_role) OR
          has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );

CREATE POLICY "Users can add themselves as watchers"
  ON public.ticket_watchers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage watchers"
  ON public.ticket_watchers FOR ALL
  USING (
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- RLS Policies for escalation_policies
CREATE POLICY "Everyone can view active escalation policies"
  ON public.escalation_policies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage escalation policies"
  ON public.escalation_policies FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role));

-- RLS Policies for email_notifications
CREATE POLICY "Users can view their own email notifications"
  ON public.email_notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

CREATE POLICY "System can insert email notifications"
  ON public.email_notifications FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_notification_prefs
CREATE POLICY "Users can manage their own notification preferences"
  ON public.user_notification_prefs FOR ALL
  USING (user_id = auth.uid());

-- Add update triggers
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_request_types_updated_at
  BEFORE UPDATE ON public.request_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_routing_rules_updated_at
  BEFORE UPDATE ON public.routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_escalation_policies_updated_at
  BEFORE UPDATE ON public.escalation_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_prefs_updated_at
  BEFORE UPDATE ON public.user_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed departments and request types
INSERT INTO public.departments (name, description) VALUES
  ('General', 'General department for intranet requests'),
  ('IT', 'Information Technology'),
  ('HR', 'Human Resources'),
  ('Finance', 'Finance and Accounting'),
  ('Facilities', 'Facility Services'),
  ('Marketing', 'Marketing and Communications');

-- Get department IDs for seeding request types
DO $$
DECLARE
  dept_general UUID;
  dept_it UUID;
  dept_hr UUID;
  dept_finance UUID;
  dept_facilities UUID;
  dept_marketing UUID;
BEGIN
  SELECT id INTO dept_general FROM public.departments WHERE name = 'General';
  SELECT id INTO dept_it FROM public.departments WHERE name = 'IT';
  SELECT id INTO dept_hr FROM public.departments WHERE name = 'HR';
  SELECT id INTO dept_finance FROM public.departments WHERE name = 'Finance';
  SELECT id INTO dept_facilities FROM public.departments WHERE name = 'Facilities';
  SELECT id INTO dept_marketing FROM public.departments WHERE name = 'Marketing';

  INSERT INTO public.request_types (department_id, name, slug, description) VALUES
    (dept_finance, 'Accounts Payable', 'accounts-payable', 'Accounts payable requests'),
    (dept_facilities, 'Facility Services', 'facility-services', 'Facility and building services'),
    (dept_finance, 'Finance Request', 'finance-request', 'General finance requests'),
    (dept_it, 'Hardware Request', 'hardware-request', 'Hardware and equipment requests'),
    (dept_hr, 'HR Request', 'hr-request', 'Human resources requests'),
    (dept_it, 'IT Service Desk', 'it-service-desk', 'IT support and service desk tickets'),
    (dept_marketing, 'Marketing Request', 'marketing-request', 'Marketing campaign and material requests'),
    (dept_marketing, 'Marketing Service', 'marketing-service', 'Marketing services'),
    (dept_hr, 'New User Account', 'new-user-account', 'New employee account setup'),
    (dept_general, 'Office Services', 'office-services', 'General office services'),
    (dept_it, 'Technology Training', 'technology-training', 'Technology training requests'),
    (dept_it, 'Toner Request', 'toner-request', 'Printer toner requests'),
    (dept_hr, 'User Offboarding', 'user-offboarding', 'Employee offboarding and account closure');
END $$;