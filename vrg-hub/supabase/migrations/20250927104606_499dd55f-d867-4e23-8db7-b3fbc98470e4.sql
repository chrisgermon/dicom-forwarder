-- Add new companies for the authorized domains
INSERT INTO public.companies (name, slug, subdomain, billing_contact_email) VALUES
  ('Vision Radiology', 'vision-radiology', 'vision-radiology', 'billing@visionradiology.com.au'),
  ('CrowdIT', 'crowdit', 'crowdit', 'billing@crowdit.com.au');

-- Add the authorized domains
INSERT INTO public.company_domains (company_id, domain) VALUES
  ((SELECT id FROM public.companies WHERE slug = 'vision-radiology'), 'visionradiology.com.au'),
  ((SELECT id FROM public.companies WHERE slug = 'crowdit'), 'crowdit.com.au');