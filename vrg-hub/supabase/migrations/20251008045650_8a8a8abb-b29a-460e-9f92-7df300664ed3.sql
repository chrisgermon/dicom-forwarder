-- Add location_id column to helpdesk_tickets table
ALTER TABLE public.helpdesk_tickets
ADD COLUMN location_id UUID REFERENCES public.company_locations(id);

-- Add index for better performance
CREATE INDEX idx_helpdesk_tickets_location ON public.helpdesk_tickets(location_id);