-- Add SLA tracking and enhanced fields to helpdesk_tickets
ALTER TABLE helpdesk_tickets 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_response_minutes INTEGER,
ADD COLUMN IF NOT EXISTS sla_resolution_minutes INTEGER,
ADD COLUMN IF NOT EXISTS sla_response_breach BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sla_resolution_breach BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reopened_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER,
ADD COLUMN IF NOT EXISTS satisfaction_comment TEXT,
ADD COLUMN IF NOT EXISTS parent_ticket_id UUID REFERENCES helpdesk_tickets(id),
ADD COLUMN IF NOT EXISTS related_ticket_ids UUID[] DEFAULT '{}';

-- Create index for tags search
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_tags ON helpdesk_tickets USING GIN(tags);

-- Create index for custom fields search
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_custom_fields ON helpdesk_tickets USING GIN(custom_fields);

-- Enhance helpdesk_ticket_comments for internal notes
ALTER TABLE helpdesk_ticket_comments 
ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES helpdesk_ticket_comments(id),
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Create SLA configuration table
CREATE TABLE IF NOT EXISTS helpdesk_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES helpdesk_departments(id) ON DELETE CASCADE,
  priority request_priority NOT NULL,
  response_time_minutes INTEGER NOT NULL,
  resolution_time_minutes INTEGER NOT NULL,
  business_hours_only BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_helpdesk_sla_configs_company ON helpdesk_sla_configs(company_id);
CREATE INDEX idx_helpdesk_sla_configs_department ON helpdesk_sla_configs(department_id);

ALTER TABLE helpdesk_sla_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage SLA configs"
ON helpdesk_sla_configs
FOR ALL
TO authenticated
USING (
  (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "Users can view SLA configs"
ON helpdesk_sla_configs
FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- Create automation rules table
CREATE TABLE IF NOT EXISTS helpdesk_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  trigger_event TEXT NOT NULL, -- 'ticket_created', 'ticket_updated', 'comment_added', 'status_changed'
  conditions JSONB NOT NULL DEFAULT '{}', -- flexible conditions like priority, department, keywords
  actions JSONB NOT NULL DEFAULT '[]', -- array of actions: assign, update_status, send_email, add_tag
  execution_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_helpdesk_automation_rules_company ON helpdesk_automation_rules(company_id);
CREATE INDEX idx_helpdesk_automation_rules_trigger ON helpdesk_automation_rules(trigger_event);

ALTER TABLE helpdesk_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automation rules"
ON helpdesk_automation_rules
FOR ALL
TO authenticated
USING (
  (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), company_id, 'tenant_admin'::user_role))
  OR has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "Users can view automation rules"
ON helpdesk_automation_rules
FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- Create macros/templates table
CREATE TABLE IF NOT EXISTS helpdesk_macros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  actions JSONB DEFAULT '[]', -- e.g., set status, add tags, assign
  is_public BOOLEAN DEFAULT TRUE, -- if false, only created_by can use
  department_id UUID REFERENCES helpdesk_departments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_helpdesk_macros_company ON helpdesk_macros(company_id);
CREATE INDEX idx_helpdesk_macros_department ON helpdesk_macros(department_id);

ALTER TABLE helpdesk_macros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage macros"
ON helpdesk_macros
FOR ALL
TO authenticated
USING (
  (company_id = get_user_company(auth.uid()) AND (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_role(auth.uid(), company_id, 'manager'::user_role)
  )) OR 
  has_global_role(auth.uid(), 'super_admin'::user_role) OR
  created_by = auth.uid()
);

CREATE POLICY "Users can view public macros"
ON helpdesk_macros
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) AND 
  (is_public = TRUE OR created_by = auth.uid())
);

-- Create knowledge base table
CREATE TABLE IF NOT EXISTS helpdesk_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES helpdesk_departments(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_helpdesk_kb_company ON helpdesk_knowledge_base(company_id);
CREATE INDEX idx_helpdesk_kb_department ON helpdesk_knowledge_base(department_id);
CREATE INDEX idx_helpdesk_kb_tags ON helpdesk_knowledge_base USING GIN(tags);
CREATE INDEX idx_helpdesk_kb_search ON helpdesk_knowledge_base USING GIN(to_tsvector('english', title || ' ' || content));

ALTER TABLE helpdesk_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage knowledge base"
ON helpdesk_knowledge_base
FOR ALL
TO authenticated
USING (
  (company_id = get_user_company(auth.uid()) AND (
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
    has_role(auth.uid(), company_id, 'manager'::user_role)
  )) OR 
  has_global_role(auth.uid(), 'super_admin'::user_role)
);

CREATE POLICY "Users can view published articles"
ON helpdesk_knowledge_base
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company(auth.uid()) AND is_published = TRUE
);

-- Create ticket analytics/metrics table
CREATE TABLE IF NOT EXISTS helpdesk_ticket_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
  first_response_time_minutes INTEGER,
  resolution_time_minutes INTEGER,
  total_comments INTEGER DEFAULT 0,
  agent_responses INTEGER DEFAULT 0,
  customer_responses INTEGER DEFAULT 0,
  reopened_times INTEGER DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_helpdesk_ticket_metrics_ticket ON helpdesk_ticket_metrics(ticket_id);

ALTER TABLE helpdesk_ticket_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for their accessible tickets"
ON helpdesk_ticket_metrics
FOR SELECT
TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM helpdesk_tickets
    WHERE created_by = auth.uid() 
      OR assigned_to = auth.uid()
      OR (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), company_id, 'manager'::user_role) OR
        has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
        has_global_role(auth.uid(), 'super_admin'::user_role)
      ))
  )
);

-- Create saved searches table
CREATE TABLE IF NOT EXISTS helpdesk_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_helpdesk_saved_searches_user ON helpdesk_saved_searches(user_id);

ALTER TABLE helpdesk_saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved searches"
ON helpdesk_saved_searches
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view public saved searches"
ON helpdesk_saved_searches
FOR SELECT
TO authenticated
USING (is_public = TRUE OR user_id = auth.uid());

-- Function to calculate SLA breach
CREATE OR REPLACE FUNCTION calculate_ticket_sla()
RETURNS TRIGGER AS $$
DECLARE
  sla_config RECORD;
  response_deadline TIMESTAMP WITH TIME ZONE;
  resolution_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get SLA configuration
  SELECT * INTO sla_config
  FROM helpdesk_sla_configs
  WHERE company_id = NEW.company_id
    AND (department_id = NEW.department_id OR department_id IS NULL)
    AND priority = NEW.priority
  ORDER BY department_id NULLS LAST
  LIMIT 1;
  
  IF sla_config.id IS NOT NULL THEN
    NEW.sla_response_minutes := sla_config.response_time_minutes;
    NEW.sla_resolution_minutes := sla_config.resolution_time_minutes;
    
    -- Calculate deadlines
    response_deadline := NEW.created_at + (sla_config.response_time_minutes || ' minutes')::INTERVAL;
    resolution_deadline := NEW.created_at + (sla_config.resolution_time_minutes || ' minutes')::INTERVAL;
    
    -- Check response SLA
    IF NEW.first_response_at IS NOT NULL AND NEW.first_response_at > response_deadline THEN
      NEW.sla_response_breach := TRUE;
    ELSIF NEW.first_response_at IS NULL AND now() > response_deadline THEN
      NEW.sla_response_breach := TRUE;
    END IF;
    
    -- Check resolution SLA
    IF NEW.status IN ('resolved', 'closed') THEN
      IF NEW.resolved_at IS NOT NULL AND NEW.resolved_at > resolution_deadline THEN
        NEW.sla_resolution_breach := TRUE;
      END IF;
    ELSIF now() > resolution_deadline THEN
      NEW.sla_resolution_breach := TRUE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for SLA calculation
DROP TRIGGER IF EXISTS trigger_calculate_ticket_sla ON helpdesk_tickets;
CREATE TRIGGER trigger_calculate_ticket_sla
BEFORE INSERT OR UPDATE ON helpdesk_tickets
FOR EACH ROW
EXECUTE FUNCTION calculate_ticket_sla();

-- Function to update first response time
CREATE OR REPLACE FUNCTION update_first_response()
RETURNS TRIGGER AS $$
DECLARE
  ticket RECORD;
BEGIN
  -- Get ticket info
  SELECT * INTO ticket FROM helpdesk_tickets WHERE id = NEW.ticket_id;
  
  -- Update first response if this is the first staff response
  IF ticket.first_response_at IS NULL AND NEW.is_internal = FALSE THEN
    -- Check if commenter is staff (not the ticket creator)
    IF NEW.user_id != ticket.created_by THEN
      UPDATE helpdesk_tickets
      SET first_response_at = NEW.created_at
      WHERE id = NEW.ticket_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for first response tracking
DROP TRIGGER IF EXISTS trigger_update_first_response ON helpdesk_ticket_comments;
CREATE TRIGGER trigger_update_first_response
AFTER INSERT ON helpdesk_ticket_comments
FOR EACH ROW
EXECUTE FUNCTION update_first_response();

-- Update triggers on existing tables
CREATE TRIGGER update_helpdesk_sla_configs_updated_at
BEFORE UPDATE ON helpdesk_sla_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_helpdesk_automation_rules_updated_at
BEFORE UPDATE ON helpdesk_automation_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_helpdesk_macros_updated_at
BEFORE UPDATE ON helpdesk_macros
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_helpdesk_knowledge_base_updated_at
BEFORE UPDATE ON helpdesk_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_helpdesk_saved_searches_updated_at
BEFORE UPDATE ON helpdesk_saved_searches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();