-- Add brand and location tracking to fax campaigns
ALTER TABLE notifyre_fax_campaigns 
ADD COLUMN brand_id uuid REFERENCES brands(id),
ADD COLUMN location_id uuid REFERENCES locations(id);

-- Create table for tracking email campaign assignments (Mailchimp campaigns aren't stored in DB)
CREATE TABLE mailchimp_campaign_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL UNIQUE,
  brand_id uuid REFERENCES brands(id),
  location_id uuid REFERENCES locations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mailchimp_campaign_assignments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read assignments
CREATE POLICY "Users can read campaign assignments"
ON mailchimp_campaign_assignments
FOR SELECT
USING (true);

-- Allow admins to manage assignments
CREATE POLICY "Admins can manage campaign assignments"
ON mailchimp_campaign_assignments
FOR ALL
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'marketing_manager'::app_role)
);