-- Add quick_actions field to company_home_pages table
ALTER TABLE public.company_home_pages 
ADD COLUMN IF NOT EXISTS quick_actions jsonb DEFAULT '[
  {"icon": "FileText", "label": "New Request", "href": "/new-request", "color": "text-blue-600"},
  {"icon": "Calendar", "label": "My Schedule", "href": "/schedule", "color": "text-green-600"},
  {"icon": "Users", "label": "Team Directory", "href": "/directory", "color": "text-purple-600"},
  {"icon": "TrendingUp", "label": "Reports", "href": "/reports", "color": "text-orange-600"}
]'::jsonb;