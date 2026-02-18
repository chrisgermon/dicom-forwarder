-- Insert newsletter template for Admin Managers department
INSERT INTO public.newsletter_templates (department, display_name, description, sections) VALUES
  ('Admin Managers', 'Admin Managers – Newsletter Submission', 'Add your monthly administration and management updates. Sections marked with * are required unless you mark no update.', 
   '[
     {"key": "admin_updates", "label": "Administration updates & highlights", "required": true, "max_chars": 1500},
     {"key": "management_initiatives", "label": "Management initiatives & projects", "required": true, "max_chars": 1500},
     {"key": "process_improvements", "label": "Process improvements & efficiencies", "required": false, "max_chars": 1500},
     {"key": "upcoming_changes", "label": "Upcoming changes & announcements", "required": false, "max_chars": 1500}
   ]'::jsonb)
ON CONFLICT (department) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sections = EXCLUDED.sections,
  updated_at = now();