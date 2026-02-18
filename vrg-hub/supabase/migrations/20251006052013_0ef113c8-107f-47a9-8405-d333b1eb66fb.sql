-- Create storage bucket for helpdesk attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('helpdesk-attachments', 'helpdesk-attachments', false);

-- Create table to track ticket attachments
CREATE TABLE public.helpdesk_ticket_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.helpdesk_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for attachments
CREATE POLICY "Users can view attachments for tickets they can see"
ON public.helpdesk_ticket_attachments
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM public.helpdesk_tickets
    WHERE created_by = auth.uid()
      OR assigned_to = auth.uid()
      OR (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), company_id, 'manager'::user_role) OR
        has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
        has_global_role(auth.uid(), 'super_admin'::user_role)
      ))
  )
);

CREATE POLICY "Users can upload attachments to accessible tickets"
ON public.helpdesk_ticket_attachments
FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid() AND
  ticket_id IN (
    SELECT id FROM public.helpdesk_tickets
    WHERE created_by = auth.uid()
      OR assigned_to = auth.uid()
      OR (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), company_id, 'manager'::user_role) OR
        has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
        has_global_role(auth.uid(), 'super_admin'::user_role)
      ))
  )
);

CREATE POLICY "Users can delete their own attachments"
ON public.helpdesk_ticket_attachments
FOR DELETE
USING (uploaded_by = auth.uid());

-- Storage policies for helpdesk attachments
CREATE POLICY "Users can view attachments for their accessible tickets"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'helpdesk-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT ticket_id::text FROM public.helpdesk_ticket_attachments
    WHERE ticket_id IN (
      SELECT id FROM public.helpdesk_tickets
      WHERE created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR (company_id = get_user_company(auth.uid()) AND (
          has_role(auth.uid(), company_id, 'manager'::user_role) OR
          has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
          has_global_role(auth.uid(), 'super_admin'::user_role)
        ))
    )
  )
);

CREATE POLICY "Users can upload attachments to their tickets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'helpdesk-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.helpdesk_tickets
    WHERE created_by = auth.uid()
      OR assigned_to = auth.uid()
      OR (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), company_id, 'manager'::user_role) OR
        has_role(auth.uid(), company_id, 'tenant_admin'::user_role) OR
        has_global_role(auth.uid(), 'super_admin'::user_role)
      ))
  )
);

CREATE POLICY "Users can delete their own uploaded attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'helpdesk-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT ticket_id::text FROM public.helpdesk_ticket_attachments
    WHERE uploaded_by = auth.uid()
  )
);