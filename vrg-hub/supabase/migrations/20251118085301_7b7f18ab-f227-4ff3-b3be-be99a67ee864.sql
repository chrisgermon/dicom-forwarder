-- PHASE 1: CRITICAL SECURITY & FUNCTIONALITY FIXES

-- 1.1 Fix RLS Policies for ticket_comments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ticket_comments' AND policyname = 'Users can view comments on accessible tickets'
  ) THEN
    CREATE POLICY "Users can view comments on accessible tickets"
    ON ticket_comments FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_comments.ticket_id
        AND (
          t.user_id = auth.uid()
          OR t.assigned_to = auth.uid()
          OR has_role(auth.uid(), 'manager'::app_role)
          OR has_role(auth.uid(), 'tenant_admin'::app_role)
          OR has_role(auth.uid(), 'super_admin'::app_role)
        )
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ticket_comments' AND policyname = 'Authenticated users can add comments'
  ) THEN
    CREATE POLICY "Authenticated users can add comments"
    ON ticket_comments FOR INSERT
    WITH CHECK (auth.uid() = author_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ticket_comments' AND policyname = 'Users can edit their own comments'
  ) THEN
    CREATE POLICY "Users can edit their own comments"
    ON ticket_comments FOR UPDATE
    USING (auth.uid() = author_user_id);
  END IF;
END $$;

-- Fix RLS policies for ticket_events (add missing SELECT policy)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ticket_events' AND policyname = 'Users can view events on accessible tickets'
  ) THEN
    CREATE POLICY "Users can view events on accessible tickets"
    ON ticket_events FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_events.ticket_id
        AND (
          t.user_id = auth.uid()
          OR t.assigned_to = auth.uid()
          OR has_role(auth.uid(), 'manager'::app_role)
          OR has_role(auth.uid(), 'tenant_admin'::app_role)
          OR has_role(auth.uid(), 'super_admin'::app_role)
        )
      )
    );
  END IF;
END $$;

-- 1.2 Create default routing rules for all active request types
INSERT INTO routing_rules (request_type_id, strategy, is_active, priority)
SELECT 
  id,
  'round_robin' as strategy,
  true as is_active,
  100 as priority
FROM request_types
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- 1.3 Create routing assignment function
CREATE OR REPLACE FUNCTION assign_ticket_to_team(ticket_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_type_id uuid;
  v_routing_rule routing_rules;
  v_assignee_id uuid;
BEGIN
  SELECT request_type_id INTO v_request_type_id
  FROM tickets WHERE id = ticket_id;
  
  SELECT * INTO v_routing_rule
  FROM routing_rules
  WHERE request_type_id = v_request_type_id
  AND is_active = true
  ORDER BY priority DESC
  LIMIT 1;
  
  IF v_routing_rule.strategy = 'round_robin' THEN
    SELECT tm.user_id INTO v_assignee_id
    FROM team_members tm
    WHERE tm.team_id = v_routing_rule.team_id
    AND (tm.out_of_office_from IS NULL OR tm.out_of_office_from > CURRENT_DATE)
    ORDER BY (
      SELECT COUNT(*) FROM tickets t 
      WHERE t.assigned_to = tm.user_id 
      AND t.status NOT IN ('completed', 'closed', 'cancelled')
    )
    LIMIT 1;
  ELSIF v_routing_rule.default_assignee_user_id IS NOT NULL THEN
    v_assignee_id := v_routing_rule.default_assignee_user_id;
  END IF;
  
  RETURN v_assignee_id;
END;
$$;

-- Create auto-assignment trigger
CREATE OR REPLACE FUNCTION auto_assign_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignee_id uuid;
BEGIN
  IF NEW.assigned_to IS NULL AND NEW.request_type_id IS NOT NULL THEN
    v_assignee_id := assign_ticket_to_team(NEW.id);
    
    IF v_assignee_id IS NOT NULL THEN
      NEW.assigned_to := v_assignee_id;
      
      INSERT INTO ticket_events (ticket_id, type, actor_user_id, data)
      VALUES (
        NEW.id,
        'assigned',
        NEW.user_id,
        jsonb_build_object('assigned_to', v_assignee_id, 'auto_assigned', true)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_ticket ON tickets;
CREATE TRIGGER trigger_auto_assign_ticket
BEFORE INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION auto_assign_ticket();

-- PHASE 2: DATA MIGRATION
INSERT INTO tickets (
  id, user_id, title, description, 
  priority, status, brand_id, location_id, 
  source, created_at, updated_at, metadata
)
SELECT 
  hr.id, hr.user_id, hr.title, 
  COALESCE(hr.description, '') as description,
  hr.priority, 
  CASE 
    WHEN hr.status IN ('open', 'in_progress', 'completed', 'closed', 'cancelled', 'on_hold') THEN hr.status
    ELSE 'open'
  END as status,
  hr.brand_id, hr.location_id,
  'hardware_request_legacy' as source,
  hr.created_at, hr.updated_at,
  jsonb_build_object(
    'business_justification', hr.business_justification,
    'clinic_name', hr.clinic_name,
    'total_amount', hr.total_amount,
    'currency', hr.currency,
    'expected_delivery_date', hr.expected_delivery_date,
    'original_status', hr.status,
    'migrated_from_hardware_requests', true
  ) as metadata
FROM hardware_requests hr
WHERE hr.id NOT IN (SELECT id FROM tickets WHERE id = hr.id)
ON CONFLICT (id) DO NOTHING;

-- PHASE 3: WORKFLOW AUTOMATION
CREATE OR REPLACE FUNCTION log_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_events (ticket_id, type, actor_user_id, data)
    VALUES (
      NEW.id,
      'status_changed',
      auth.uid(),
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
    NEW.last_activity = NOW();
  END IF;
  
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO ticket_events (ticket_id, type, actor_user_id, data)
    VALUES (
      NEW.id,
      'assigned',
      COALESCE(auth.uid(), NEW.user_id),
      jsonb_build_object('assigned_to', NEW.assigned_to, 'previous_assignee', OLD.assigned_to)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_ticket_status_change ON tickets;
CREATE TRIGGER trigger_log_ticket_status_change
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION log_ticket_status_change();

-- PHASE 4: POLISH & DATA QUALITY
CREATE TABLE IF NOT EXISTS assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  from_user_id uuid REFERENCES profiles(id),
  to_user_id uuid REFERENCES profiles(id) NOT NULL,
  assigned_by uuid REFERENCES profiles(id) NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assignment_history' AND policyname = 'Users can view assignment history for accessible tickets'
  ) THEN
    CREATE POLICY "Users can view assignment history for accessible tickets"
    ON assignment_history FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = assignment_history.ticket_id
        AND (
          t.user_id = auth.uid()
          OR t.assigned_to = auth.uid()
          OR has_role(auth.uid(), 'manager'::app_role)
          OR has_role(auth.uid(), 'tenant_admin'::app_role)
          OR has_role(auth.uid(), 'super_admin'::app_role)
        )
      )
    );
  END IF;
END $$;

-- Standardize data
UPDATE tickets SET source = 'web_portal' WHERE source IN ('portal', 'web');
UPDATE tickets SET source = 'email' WHERE source IN ('mail', 'e-mail');
UPDATE tickets SET source = 'phone' WHERE source IN ('call', 'telephone');
UPDATE tickets SET metadata = COALESCE(metadata, '{}'::jsonb) WHERE metadata IS NULL;

-- Set search_path on all functions for security
ALTER FUNCTION has_rbac_role SET search_path = public;
ALTER FUNCTION get_request_approver SET search_path = public;
ALTER FUNCTION validate_request_type_form_template SET search_path = public;
ALTER FUNCTION clean_expired_sharepoint_cache SET search_path = public;
ALTER FUNCTION is_cycle_deadline_passed SET search_path = public;