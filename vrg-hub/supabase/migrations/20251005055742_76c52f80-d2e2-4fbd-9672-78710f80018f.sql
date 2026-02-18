-- Create table for company-specific home page configurations
CREATE TABLE IF NOT EXISTS public.company_home_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quick_access_tiles jsonb NOT NULL DEFAULT '[]'::jsonb,
  category_buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  quick_links_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_home_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company home page"
  ON public.company_home_pages
  FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Tenant admins can manage their company home page"
  ON public.company_home_pages
  FOR ALL
  USING (
    company_id = get_user_company(auth.uid()) AND
    has_role(auth.uid(), company_id, 'tenant_admin'::user_role)
  );

CREATE POLICY "Super admins can manage all company home pages"
  ON public.company_home_pages
  FOR ALL
  USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_company_home_pages_updated_at
  BEFORE UPDATE ON public.company_home_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Vision Radiology Group default home page
INSERT INTO public.company_home_pages (company_id, quick_access_tiles, category_buttons, quick_links_sections)
SELECT 
  id,
  '[
    {"id": "1", "title": "Ento", "url": "#", "color": "hsl(var(--primary))", "width": 1, "height": 1},
    {"id": "2", "title": "IntelePACS", "url": "#", "color": "hsl(var(--primary))", "width": 1, "height": 1},
    {"id": "3", "title": "Reception", "url": "#", "color": "hsl(var(--primary))", "width": 1, "height": 1},
    {"id": "4", "title": "Human Resources Documents", "url": "#", "color": "hsl(var(--primary))", "width": 1, "height": 1}
  ]'::jsonb,
  '[
    {"id": "1", "label": "Request New Hardware", "url": "/new-request"},
    {"id": "2", "label": "Request Toner", "url": "/new-toner-request"},
    {"id": "3", "label": "New User Account", "url": "/new-user-account"},
    {"id": "4", "label": "User Offboarding", "url": "/new-user-offboarding"},
    {"id": "5", "label": "Marketing Request", "url": "/new-marketing-request"}
  ]'::jsonb,
  '[
    {
      "id": "1",
      "title": "Quick Access",
      "links": [
        {"id": "1", "title": "EapAssist - Employee Assistance Program", "url": "https://www.eapassist.com.au", "icon": "🤝"},
        {"id": "2", "title": "Emergency Medical Response Guides", "url": "#", "icon": "📋"},
        {"id": "3", "title": "Equipment Support", "url": "#", "icon": "📞"},
        {"id": "4", "title": "Reporting a Workplace Incident", "url": "#", "icon": "⚠️"},
        {"id": "5", "title": "Maintenance or Repair Request", "url": "#", "icon": "🔧"}
      ]
    },
    {
      "id": "2",
      "title": "Online Calculators",
      "links": [
        {"id": "1", "title": "Monash Ultrasound", "url": "https://monashultrasound.com.au", "icon": "🧮"},
        {"id": "2", "title": "Pulmonary Nodule Risk Calculator", "url": "https://www.uptodate.com", "icon": "🧮"},
        {"id": "3", "title": "T3 Fetal Dopplers", "url": "https://fetalmedicine.org", "icon": "🧮"},
        {"id": "4", "title": "Paed Renal Centiles", "url": "https://radiology-universe.org/calculator/pediatric-spleen-sizes/", "icon": "🧮"},
        {"id": "5", "title": "Paed Spleen Centiles", "url": "https://radiology-universe.org/calculator/pediatric-spleen-sizes/", "icon": "🧮"},
        {"id": "6", "title": "Due Date Calculator", "url": "https://perinatology.com", "icon": "🧮"},
        {"id": "7", "title": "Body Mass Index Calculator", "url": "https://www.betterhealth.vic.gov.au", "icon": "🧮"}
      ]
    }
  ]'::jsonb
FROM public.companies
WHERE name = 'Vision Radiology Group'
ON CONFLICT (company_id) DO NOTHING;