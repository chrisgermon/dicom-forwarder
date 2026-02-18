-- Add approval_emails column to companies table
ALTER TABLE public.companies 
ADD COLUMN approval_emails text[];

-- Create index for better performance when querying approval emails
CREATE INDEX idx_companies_approval_emails ON public.companies USING GIN(approval_emails);