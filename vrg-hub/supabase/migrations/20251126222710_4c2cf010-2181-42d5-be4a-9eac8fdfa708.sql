-- Create storage bucket for reminder attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('reminder-attachments', 'reminder-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create reminder_attachments table
CREATE TABLE IF NOT EXISTS public.reminder_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid REFERENCES public.reminders(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  content_type text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.reminder_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminder_attachments
CREATE POLICY "Users can view attachments for their reminders"
ON public.reminder_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.reminders r
    WHERE r.id = reminder_attachments.reminder_id
    AND r.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Users can upload attachments to their reminders"
ON public.reminder_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reminders r
    WHERE r.id = reminder_attachments.reminder_id
    AND r.user_id = auth.uid()
  )
  AND auth.uid() = uploaded_by
);

CREATE POLICY "Users can delete their reminder attachments"
ON public.reminder_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.reminders r
    WHERE r.id = reminder_attachments.reminder_id
    AND r.user_id = auth.uid()
  )
);

-- Storage policies for reminder-attachments bucket
CREATE POLICY "Users can view their reminder attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reminder-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT r.id::text FROM public.reminders r WHERE r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload reminder attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reminder-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT r.id::text FROM public.reminders r WHERE r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their reminder attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reminder-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT r.id::text FROM public.reminders r WHERE r.user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_reminder_attachments_reminder_id 
ON public.reminder_attachments(reminder_id);