-- Insert newsletter templates for all departments
INSERT INTO public.newsletter_templates (department, display_name, description, sections) VALUES
  ('Finance', 'Finance – Newsletter Submission', 'Add your monthly financial updates. Sections marked with * are required unless you mark no update.', 
   '[
     {"key": "financial_summary", "label": "Financial summary & highlights", "required": true, "max_chars": 1500},
     {"key": "budget_updates", "label": "Budget updates & variances", "required": true, "max_chars": 1500},
     {"key": "upcoming_changes", "label": "Upcoming changes & initiatives", "required": false, "max_chars": 1500},
     {"key": "cost_savings", "label": "Cost savings & efficiencies", "required": false, "max_chars": 1500}
   ]'::jsonb),
  
  ('Commercial/Marketing', 'Commercial/Marketing – Newsletter Submission', 'Add your monthly commercial and marketing updates. Sections marked with * are required unless you mark no update.', 
   '[
     {"key": "campaigns_activity", "label": "Marketing campaigns & activity", "required": true, "max_chars": 1500},
     {"key": "market_insights", "label": "Market insights & trends", "required": true, "max_chars": 1500},
     {"key": "upcoming_initiatives", "label": "Upcoming initiatives", "required": false, "max_chars": 1500},
     {"key": "partnership_updates", "label": "Partnership updates", "required": false, "max_chars": 1500}
   ]'::jsonb),
  
  ('CMO', 'CMO – Newsletter Submission', 'Add your monthly CMO updates. Sections marked with * are required unless you mark no update.', 
   '[
     {"key": "clinical_updates", "label": "Clinical updates & initiatives", "required": true, "max_chars": 1500},
     {"key": "quality_safety", "label": "Quality & safety highlights", "required": true, "max_chars": 1500},
     {"key": "training_development", "label": "Training & development", "required": false, "max_chars": 1500},
     {"key": "upcoming_changes", "label": "Upcoming changes", "required": false, "max_chars": 1500}
   ]'::jsonb),
  
  ('HR / People & Culture / OHS', 'HR / People & Culture / OHS – Newsletter Submission', 'Add your monthly HR, people & culture, and OHS updates. Sections marked with * are required unless you mark no update.', 
   '[
     {"key": "people_updates", "label": "People updates & announcements", "required": true, "max_chars": 1500},
     {"key": "ohs_safety", "label": "OHS & safety updates", "required": true, "max_chars": 1500},
     {"key": "training_programs", "label": "Training programs & initiatives", "required": false, "max_chars": 1500},
     {"key": "policy_changes", "label": "Policy changes & reminders", "required": false, "max_chars": 1500}
   ]'::jsonb),
  
  ('Operations Managers', 'Operations Managers – Newsletter Submission', 'Add your monthly operations updates. Sections marked with * are required unless you mark no update.', 
   '[
     {"key": "operational_highlights", "label": "Operational highlights & achievements", "required": true, "max_chars": 1500},
     {"key": "performance_metrics", "label": "Performance metrics & KPIs", "required": true, "max_chars": 1500},
     {"key": "process_improvements", "label": "Process improvements", "required": false, "max_chars": 1500},
     {"key": "upcoming_changes", "label": "Upcoming changes & initiatives", "required": false, "max_chars": 1500}
   ]'::jsonb),
  
  ('Technical Partners', 'Technical Partners – Newsletter Submission', 'Add your monthly technical partner updates. Sections marked with * are required unless you mark no update.', 
   '[
     {"key": "partnership_updates", "label": "Partnership updates & highlights", "required": true, "max_chars": 1500},
     {"key": "technical_developments", "label": "Technical developments", "required": true, "max_chars": 1500},
     {"key": "integration_updates", "label": "Integration updates", "required": false, "max_chars": 1500},
     {"key": "upcoming_changes", "label": "Upcoming changes", "required": false, "max_chars": 1500}
   ]'::jsonb),
  
  ('Workflow Manager', 'Workflow Manager – Newsletter Submission', 'Add your monthly workflow management updates. Sections marked with * are required unless you mark no update.', 
   '[
     {"key": "workflow_improvements", "label": "Workflow improvements & optimizations", "required": true, "max_chars": 1500},
     {"key": "efficiency_metrics", "label": "Efficiency metrics & performance", "required": true, "max_chars": 1500},
     {"key": "process_changes", "label": "Process changes", "required": false, "max_chars": 1500},
     {"key": "upcoming_initiatives", "label": "Upcoming initiatives", "required": false, "max_chars": 1500}
   ]'::jsonb)
ON CONFLICT (department) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sections = EXCLUDED.sections,
  updated_at = now();