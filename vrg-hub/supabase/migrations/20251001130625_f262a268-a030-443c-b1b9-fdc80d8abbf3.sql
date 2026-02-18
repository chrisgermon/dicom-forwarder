-- Make business_justification optional for marketing_requests
ALTER TABLE public.marketing_requests ALTER COLUMN business_justification DROP NOT NULL;

-- Make business_justification optional for user_account_requests
ALTER TABLE public.user_account_requests ALTER COLUMN business_justification DROP NOT NULL;