-- Create ticket status enum
CREATE TYPE ticket_status AS ENUM ('new', 'open', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled');

-- Create ticket priority enum
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Create helpdesk departments table
CREATE TABLE public.helpdesk_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create helpdesk sub-departments table
CREATE TABLE public.helpdesk_sub_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.helpdesk_departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create helpdesk tickets table
CREATE TABLE public.helpdesk_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  assigned_to UUID,
  department_id UUID REFERENCES public.helpdesk_departments(id),
  sub_department_id UUID REFERENCES public.helpdesk_sub_departments(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'new',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create helpdesk ticket comments table
CREATE TABLE public.helpdesk_ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create helpdesk email templates table
CREATE TABLE public.helpdesk_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  department_id UUID REFERENCES public.helpdesk_departments(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create helpdesk routing rules table
CREATE TABLE public.helpdesk_routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.helpdesk_departments(id) ON DELETE CASCADE,
  sub_department_id UUID REFERENCES public.helpdesk_sub_departments(id) ON DELETE CASCADE,
  auto_assign_to UUID,
  priority ticket_priority,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create helpdesk ticket status history table
CREATE TABLE public.helpdesk_ticket_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  status ticket_status NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.helpdesk_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_sub_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_ticket_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Users can view their company departments"
  ON public.helpdesk_departments FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage departments"
  ON public.helpdesk_departments FOR ALL
  USING (
    company_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR has_global_role(auth.uid(), 'super_admin'::user_role))
  );

-- RLS Policies for sub-departments
CREATE POLICY "Users can view sub-departments"
  ON public.helpdesk_sub_departments FOR SELECT
  USING (
    department_id IN (
      SELECT id FROM public.helpdesk_departments 
      WHERE company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Admins can manage sub-departments"
  ON public.helpdesk_sub_departments FOR ALL
  USING (
    department_id IN (
      SELECT id FROM public.helpdesk_departments 
      WHERE company_id = get_user_company(auth.uid()) AND
      (has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR has_global_role(auth.uid(), 'super_admin'::user_role))
    )
  );

-- RLS Policies for tickets
CREATE POLICY "Users can view their tickets"
  ON public.helpdesk_tickets FOR SELECT
  USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), company_id, 'manager'::user_role) OR 
      has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR 
      has_global_role(auth.uid(), 'super_admin'::user_role)))
  );

CREATE POLICY "Users can create tickets"
  ON public.helpdesk_tickets FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Assigned users and managers can update tickets"
  ON public.helpdesk_tickets FOR UPDATE
  USING (
    assigned_to = auth.uid() OR
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), company_id, 'manager'::user_role) OR 
      has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR 
      has_global_role(auth.uid(), 'super_admin'::user_role)))
  );

-- RLS Policies for ticket comments
CREATE POLICY "Users can view comments on tickets they can see"
  ON public.helpdesk_ticket_comments FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.helpdesk_tickets 
      WHERE created_by = auth.uid() OR 
            assigned_to = auth.uid() OR
            (company_id = get_user_company(auth.uid()) AND 
             (has_role(auth.uid(), company_id, 'manager'::user_role) OR 
              has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR 
              has_global_role(auth.uid(), 'super_admin'::user_role)))
    )
  );

CREATE POLICY "Users can add comments to accessible tickets"
  ON public.helpdesk_ticket_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    ticket_id IN (
      SELECT id FROM public.helpdesk_tickets 
      WHERE created_by = auth.uid() OR assigned_to = auth.uid() OR
            (company_id = get_user_company(auth.uid()) AND 
             (has_role(auth.uid(), company_id, 'manager'::user_role) OR 
              has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR 
              has_global_role(auth.uid(), 'super_admin'::user_role)))
    )
  );

-- RLS Policies for email templates
CREATE POLICY "Users can view their company email templates"
  ON public.helpdesk_email_templates FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage email templates"
  ON public.helpdesk_email_templates FOR ALL
  USING (
    company_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR has_global_role(auth.uid(), 'super_admin'::user_role))
  );

-- RLS Policies for routing rules
CREATE POLICY "Users can view their company routing rules"
  ON public.helpdesk_routing_rules FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage routing rules"
  ON public.helpdesk_routing_rules FOR ALL
  USING (
    company_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR has_global_role(auth.uid(), 'super_admin'::user_role))
  );

-- RLS Policies for status history
CREATE POLICY "Users can view status history for accessible tickets"
  ON public.helpdesk_ticket_status_history FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.helpdesk_tickets 
      WHERE created_by = auth.uid() OR assigned_to = auth.uid() OR
            (company_id = get_user_company(auth.uid()) AND 
             (has_role(auth.uid(), company_id, 'manager'::user_role) OR 
              has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR 
              has_global_role(auth.uid(), 'super_admin'::user_role)))
    )
  );

CREATE POLICY "System can insert status history"
  ON public.helpdesk_ticket_status_history FOR INSERT
  WITH CHECK (changed_by = auth.uid());

-- Create triggers
CREATE TRIGGER update_helpdesk_departments_updated_at
  BEFORE UPDATE ON public.helpdesk_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_sub_departments_updated_at
  BEFORE UPDATE ON public.helpdesk_sub_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_tickets_updated_at
  BEFORE UPDATE ON public.helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_email_templates_updated_at
  BEFORE UPDATE ON public.helpdesk_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_routing_rules_updated_at
  BEFORE UPDATE ON public.helpdesk_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_helpdesk_departments_company ON public.helpdesk_departments(company_id);
CREATE INDEX idx_helpdesk_sub_departments_department ON public.helpdesk_sub_departments(department_id);
CREATE INDEX idx_helpdesk_tickets_company ON public.helpdesk_tickets(company_id);
CREATE INDEX idx_helpdesk_tickets_created_by ON public.helpdesk_tickets(created_by);
CREATE INDEX idx_helpdesk_tickets_assigned_to ON public.helpdesk_tickets(assigned_to);
CREATE INDEX idx_helpdesk_tickets_status ON public.helpdesk_tickets(status);
CREATE INDEX idx_helpdesk_tickets_department ON public.helpdesk_tickets(department_id);
CREATE INDEX idx_helpdesk_ticket_comments_ticket ON public.helpdesk_ticket_comments(ticket_id);

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_num TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(ticket_number FROM 5)::INTEGER), 0) + 1
  INTO counter
  FROM public.helpdesk_tickets
  WHERE ticket_number LIKE 'TKT-%';
  
  ticket_num := 'TKT-' || LPAD(counter::TEXT, 6, '0');
  RETURN ticket_num;
END;
$$;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Trigger to track status changes
CREATE OR REPLACE FUNCTION track_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.helpdesk_ticket_status_history (ticket_id, status, changed_by, notes)
    VALUES (
      NEW.id,
      NEW.status,
      auth.uid(),
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
    
    -- Update resolved_at or closed_at timestamps
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
      NEW.resolved_at := now();
    END IF;
    
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
      NEW.closed_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_track_ticket_status
  BEFORE UPDATE ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION track_ticket_status_change();