-- Create comprehensive audit logging trigger function
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user email from auth.users if user_id is available
  IF NEW.user_id IS NOT NULL THEN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.user_id;
  ELSIF OLD.user_id IS NOT NULL THEN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = OLD.user_id;
  ELSE
    -- Try to get from auth.uid() if available
    BEGIN
      SELECT email INTO user_email
      FROM auth.users
      WHERE id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
      user_email := NULL;
    END;
  END IF;

  -- Insert audit log
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      OLD.user_id,
      user_email,
      TG_OP,
      TG_TABLE_NAME,
      OLD.id::text,
      row_to_json(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      NEW.user_id,
      user_email,
      TG_OP,
      TG_TABLE_NAME,
      NEW.id::text,
      NULL,
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      NEW.user_id,
      user_email,
      TG_OP,
      TG_TABLE_NAME,
      NEW.id::text,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create audit triggers for key tables
CREATE TRIGGER audit_reminders_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_hardware_requests_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.hardware_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_marketing_requests_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.marketing_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_brands_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_locations_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_feature_flags_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_newsletter_cycles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.newsletter_cycles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_newsletter_submissions_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.newsletter_submissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_kb_pages_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.kb_pages
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_news_articles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();