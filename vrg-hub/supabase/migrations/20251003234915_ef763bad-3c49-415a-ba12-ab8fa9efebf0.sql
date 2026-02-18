-- Add members column to synced_office365_mailboxes to store mailbox members
ALTER TABLE public.synced_office365_mailboxes
ADD COLUMN IF NOT EXISTS members jsonb DEFAULT '[]'::jsonb;