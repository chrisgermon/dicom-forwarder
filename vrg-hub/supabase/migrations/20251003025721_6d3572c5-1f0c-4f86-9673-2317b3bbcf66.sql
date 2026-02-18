-- Create storage bucket for newsletter attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('newsletter-attachments', 'newsletter-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for newsletter attachments (with unique names)
CREATE POLICY "Newsletter: Users can upload their attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'newsletter-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Newsletter: Users can view their attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'newsletter-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Newsletter: Managers can view all attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'newsletter-attachments' AND
    (has_role(auth.uid(), get_user_company(auth.uid()), 'manager'::user_role) OR
     has_role(auth.uid(), get_user_company(auth.uid()), 'tenant_admin'::user_role) OR
     has_global_role(auth.uid(), 'super_admin'::user_role))
  );