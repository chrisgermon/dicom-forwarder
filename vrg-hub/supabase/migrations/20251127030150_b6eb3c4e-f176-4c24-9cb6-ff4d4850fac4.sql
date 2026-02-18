-- Create checklist_templates table
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL CHECK (checklist_type IN ('daily', 'weekly', 'equipment', 'cytology')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create checklist_items table
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  time_slot TEXT,
  day_restriction TEXT[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  allow_na BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT true,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create checklist_completions table
CREATE TABLE public.checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  checklist_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completion_percentage INTEGER DEFAULT 0,
  started_by UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, location_id, checklist_date)
);

-- Create checklist_item_completions table
CREATE TABLE public.checklist_item_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id UUID NOT NULL REFERENCES public.checklist_completions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'na', 'skipped')),
  initials TEXT,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(completion_id, item_id)
);

-- Create equipment_checks table
CREATE TABLE public.equipment_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  equipment_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'needs_attention', 'ordered', 'na')),
  checked_by UUID,
  initials TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklist_templates
CREATE POLICY "Users can view templates for their location"
  ON public.checklist_templates FOR SELECT
  USING (
    is_active = true AND (
      location_id IN (
        SELECT location_id FROM profiles WHERE id = auth.uid()
      ) OR
      brand_id IN (
        SELECT brand_id FROM profiles WHERE id = auth.uid()
      ) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'tenant_admin'::app_role)
    )
  );

CREATE POLICY "Admins can manage templates"
  ON public.checklist_templates FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- RLS Policies for checklist_items
CREATE POLICY "Users can view items from accessible templates"
  ON public.checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM checklist_templates
      WHERE id = checklist_items.template_id
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage items"
  ON public.checklist_items FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- RLS Policies for checklist_completions
CREATE POLICY "Users can view completions for their location"
  ON public.checklist_completions FOR SELECT
  USING (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Users can create completions"
  ON public.checklist_completions FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their completions"
  ON public.checklist_completions FOR UPDATE
  USING (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for checklist_item_completions
CREATE POLICY "Users can view item completions"
  ON public.checklist_item_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM checklist_completions
      WHERE id = checklist_item_completions.completion_id
    )
  );

CREATE POLICY "Users can create item completions"
  ON public.checklist_item_completions FOR INSERT
  WITH CHECK (
    completed_by = auth.uid()
  );

CREATE POLICY "Users can update item completions"
  ON public.checklist_item_completions FOR UPDATE
  USING (
    completed_by = auth.uid() OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- RLS Policies for equipment_checks
CREATE POLICY "Users can view equipment checks for their location"
  ON public.equipment_checks FOR SELECT
  USING (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'tenant_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Users can create equipment checks"
  ON public.equipment_checks FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update equipment checks"
  ON public.equipment_checks FOR UPDATE
  USING (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_checklist_items_template_id ON public.checklist_items(template_id);
CREATE INDEX idx_checklist_completions_date ON public.checklist_completions(checklist_date);
CREATE INDEX idx_checklist_completions_location ON public.checklist_completions(location_id);
CREATE INDEX idx_checklist_item_completions_completion_id ON public.checklist_item_completions(completion_id);
CREATE INDEX idx_equipment_checks_location_date ON public.equipment_checks(location_id, check_date);

-- Trigger to update updated_at
CREATE TRIGGER update_checklist_templates_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_completions_updated_at
  BEFORE UPDATE ON public.checklist_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_checks_updated_at
  BEFORE UPDATE ON public.equipment_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data for Loganholme template
INSERT INTO public.checklist_templates (name, description, location_id, checklist_type)
VALUES 
  ('Daily Clinic Checklist', 'Daily tasks for Loganholme clinic', '469d2406-6605-487f-821a-6baa91966dcb', 'daily'),
  ('Daily Clinic Checklist', 'Daily tasks for Rochedale clinic', 'c243c862-c56b-447b-b74d-c06dc47199e3', 'daily');

-- Insert Loganholme tasks
INSERT INTO public.checklist_items (template_id, task_description, time_slot, day_restriction, sort_order, allow_na)
SELECT t.id, task.description, task.time_slot, task.day_restriction, task.sort_order, task.allow_na
FROM (
  SELECT id FROM checklist_templates WHERE location_id = '469d2406-6605-487f-821a-6baa91966dcb' AND checklist_type = 'daily'
) t,
(VALUES
  ('Vacuum clinic (spot clean only) if not needed, mark N/A', '7am', NULL, 1, true),
  ('Check QMI QLD dictation list - Check Reports under Naushad Ahamed & any reports outstanding over 3 days', '7am', NULL, 2, false),
  ('Imaging list - all studies verified from day before', '7am', NULL, 3, false),
  ('Unverified requests - Checked and Actioned (in practice management)', '7am', NULL, 4, false),
  ('CHECK WHATSAPP GROUP - INCORRECTLY ADDED DOCTORS ALL ACTIONED', '7am', NULL, 5, false),
  ('Cytology Reports spreadsheet done', '7am', NULL, 6, false),
  ('Site Mobile - Ensure all messages read and actioned', '7am', NULL, 7, false),
  ('PORTAL OPT IN (check same day and opt in following day)', '7am', NULL, 8, false),
  ('Check back up for printer ink', '7am', ARRAY['monday'], 9, true),
  ('Call Next door to check contrast cover', '8am', NULL, 10, false),
  ('Print Rad Checklist and give to onsite rad', '8:30am', ARRAY['monday', 'tuesday'], 11, true),
  ('CHECK QCR REPORTS IN DATA MANAGEMENT', '10am', NULL, 12, false),
  ('Check the letterbox - all mail emailed to Danni', '12pm', ARRAY['friday'], 13, true),
  ('8:30AM-12:00PM XRAYS CHECKED FOR: ?FRACTURES AND/OR URGENT PATHOLOGY', '12pm', NULL, 14, false),
  ('CONFIRM LOGAN CONTRAST DOCTORS ATTENDANCE FOR NEXT WEEK', '12pm', ARRAY['thursday'], 15, true),
  ('Ensure FNA/Biopsy bookings for following week sent off and approved', '12pm', ARRAY['wednesday'], 16, true),
  ('Injections 2-3 days before - Scheduling notes (prev reports, blood thinners)', '2pm', NULL, 17, false),
  ('Injection days (day before) - PRINT ALL CONSENTS FROM KARISMA', '2pm', NULL, 18, false),
  ('Spinal Injections - Notes to bring a driver', '2pm', NULL, 19, false),
  ('Obtain prev reports for injection days - 2-3 days before', '2pm', NULL, 20, false),
  ('Breast U/S - Prev scanned in / notes on file for following day', '2pm', NULL, 21, false),
  ('Contrast Bloods - Scanned in for following day', '2pm', NULL, 22, false),
  ('Unconfirmed bookings for next day - called and confirmed (check SMS)', '3pm', NULL, 23, false),
  ('Check next 3 days for RED resource conditions', '3pm', NULL, 24, false),
  ('Pathology has collected specimens (biopsy/fna) (CHECK FRIDGE AS WELL)', '3pm', NULL, 25, false),
  ('Referrals Checked on Whatsapp group (and actioned)', '4pm', NULL, 26, false),
  ('Work site emails / faxes - all actioned/called - moved to CORRESPONDING FOLDER', '4:30pm', NULL, 27, false),
  ('Banking List Generated (End of Day)', '4:30pm', NULL, 28, false),
  ('EFTPOS Settlement (End of Day)', '4:30pm', NULL, 29, false),
  ('Book mi - all actioned/called (marked Active)', '4:30pm', NULL, 30, false),
  ('Check QMI Brisbane (LOG,ROC) dictation list', '4:45pm', NULL, 31, false),
  ('CHECK REPORTING TAB, THEN TYPING - LOOK FOR "NO IMAGES CHECK" REPORT ERROR', '4:45pm', NULL, 32, false),
  ('12:00PM-5:00PM XRAYS CHECKED FOR: ?FRACTURES AND/OR URGENT PATHOLOGY', '4:45pm', NULL, 33, false),
  ('Remind Radiologists to sign off Urgents', '4:45pm', NULL, 34, false),
  ('Bins emptied - check all rooms (GET THE TECHS TO DO)', '4:45pm', NULL, 35, true),
  ('Radiographer to advise NOMAN and RECEPTION if any urgents are life threatingly urgent', '4:55pm', NULL, 36, false),
  ('Put time clock tablet on charge', '5pm', NULL, 37, false)
) AS task(description, time_slot, day_restriction, sort_order, allow_na);

-- Insert Rochedale tasks (similar to Loganholme but starting at 8am)
INSERT INTO public.checklist_items (template_id, task_description, time_slot, day_restriction, sort_order, allow_na)
SELECT t.id, task.description, task.time_slot, task.day_restriction, task.sort_order, task.allow_na
FROM (
  SELECT id FROM checklist_templates WHERE location_id = 'c243c862-c56b-447b-b74d-c06dc47199e3' AND checklist_type = 'daily'
) t,
(VALUES
  ('Vacuum clinic (spot clean only) if not needed, mark N/A', '8am', NULL, 1, true),
  ('Check QMI QLD dictation list - Check Reports under Naushad Ahamed & any reports outstanding over 3 days', '8am', NULL, 2, false),
  ('Imaging list - all studies verified from day before', '8am', NULL, 3, false),
  ('Unverified requests - Checked and Actioned (in practice management)', '8am', NULL, 4, false),
  ('CHECK WHATSAPP GROUP - INCORRECTLY ADDED DOCTORS ALL ACTIONED', '8am', NULL, 5, false),
  ('Cytology Reports spreadsheet done', '8am', NULL, 6, false),
  ('Site Mobile - Ensure all messages read and actioned', '8am', NULL, 7, false),
  ('PORTAL OPT IN (check same day and opt in following day)', '8am', NULL, 8, false),
  ('Check back up for printer ink', '8am', ARRAY['monday'], 9, true),
  ('Call Next door to check contrast cover', '9am', NULL, 10, false),
  ('Print Rad Checklist and give to onsite rad', '9:30am', ARRAY['monday', 'tuesday'], 11, true),
  ('CHECK QCR REPORTS IN DATA MANAGEMENT', '11am', NULL, 12, false),
  ('Check the letterbox - all mail emailed to Danni', '1pm', ARRAY['friday'], 13, true),
  ('8:30AM-12:00PM XRAYS CHECKED FOR: ?FRACTURES AND/OR URGENT PATHOLOGY', '1pm', NULL, 14, false),
  ('CONFIRM LOGAN CONTRAST DOCTORS ATTENDANCE FOR NEXT WEEK', '1pm', ARRAY['thursday'], 15, true),
  ('Ensure FNA/Biopsy bookings for following week sent off and approved', '1pm', ARRAY['wednesday'], 16, true),
  ('Injections 2-3 days before - Scheduling notes (prev reports, blood thinners)', '3pm', NULL, 17, false),
  ('Injection days (day before) - PRINT ALL CONSENTS FROM KARISMA', '3pm', NULL, 18, false),
  ('Spinal Injections - Notes to bring a driver', '3pm', NULL, 19, false),
  ('Obtain prev reports for injection days - 2-3 days before', '3pm', NULL, 20, false),
  ('Breast U/S - Prev scanned in / notes on file for following day', '3pm', NULL, 21, false),
  ('Contrast Bloods - Scanned in for following day', '3pm', NULL, 22, false),
  ('Unconfirmed bookings for next day - called and confirmed (check SMS)', '4pm', NULL, 23, false),
  ('Check next 3 days for RED resource conditions', '4pm', NULL, 24, false),
  ('Pathology has collected specimens (biopsy/fna) (CHECK FRIDGE AS WELL)', '4pm', NULL, 25, false),
  ('Referrals Checked on Whatsapp group (and actioned)', '5pm', NULL, 26, false),
  ('Work site emails / faxes - all actioned/called - moved to CORRESPONDING FOLDER', '5:30pm', NULL, 27, false),
  ('Banking List Generated (End of Day)', '5:30pm', NULL, 28, false),
  ('EFTPOS Settlement (End of Day)', '5:30pm', NULL, 29, false),
  ('Book mi - all actioned/called (marked Active)', '5:30pm', NULL, 30, false),
  ('Check QMI Brisbane (LOG,ROC) dictation list', '5:45pm', NULL, 31, false),
  ('CHECK REPORTING TAB, THEN TYPING - LOOK FOR "NO IMAGES CHECK" REPORT ERROR', '5:45pm', NULL, 32, false),
  ('12:00PM-5:00PM XRAYS CHECKED FOR: ?FRACTURES AND/OR URGENT PATHOLOGY', '5:45pm', NULL, 33, false),
  ('Remind Radiologists to sign off Urgents', '5:45pm', NULL, 34, false),
  ('Bins emptied - check all rooms (GET THE TECHS TO DO)', '5:45pm', NULL, 35, true),
  ('Radiographer to advise NOMAN and RECEPTION if any urgents are life threatingly urgent', '5:55pm', NULL, 36, false),
  ('Put time clock tablet on charge', '6pm', NULL, 37, false)
) AS task(description, time_slot, day_restriction, sort_order, allow_na);