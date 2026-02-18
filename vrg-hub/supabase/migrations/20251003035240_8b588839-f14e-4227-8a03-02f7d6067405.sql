-- Add audit triggers only to tables that don't have them yet

-- Check and add missing triggers
DO $$
BEGIN
  -- Company domains
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_company_domains') THEN
    CREATE TRIGGER audit_company_domains
      AFTER INSERT OR UPDATE OR DELETE ON public.company_domains
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Company applications
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_company_applications') THEN
    CREATE TRIGGER audit_company_applications
      AFTER INSERT OR UPDATE OR DELETE ON public.company_applications
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Profiles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_profiles') THEN
    CREATE TRIGGER audit_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- User roles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_user_roles') THEN
    CREATE TRIGGER audit_user_roles
      AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- User invites
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_user_invites') THEN
    CREATE TRIGGER audit_user_invites
      AFTER INSERT OR UPDATE OR DELETE ON public.user_invites
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Hardware requests
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_hardware_requests') THEN
    CREATE TRIGGER audit_hardware_requests
      AFTER INSERT OR UPDATE OR DELETE ON public.hardware_requests
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Request items
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_request_items') THEN
    CREATE TRIGGER audit_request_items
      AFTER INSERT OR UPDATE OR DELETE ON public.request_items
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Marketing requests
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_marketing_requests') THEN
    CREATE TRIGGER audit_marketing_requests
      AFTER INSERT OR UPDATE OR DELETE ON public.marketing_requests
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- User account requests
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_user_account_requests') THEN
    CREATE TRIGGER audit_user_account_requests
      AFTER INSERT OR UPDATE OR DELETE ON public.user_account_requests
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Hardware catalog
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_hardware_catalog') THEN
    CREATE TRIGGER audit_hardware_catalog
      AFTER INSERT OR UPDATE OR DELETE ON public.hardware_catalog
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Applications
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_applications') THEN
    CREATE TRIGGER audit_applications
      AFTER INSERT OR UPDATE OR DELETE ON public.applications
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Clinic network configs
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_clinic_network_configs') THEN
    CREATE TRIGGER audit_clinic_network_configs
      AFTER INSERT OR UPDATE OR DELETE ON public.clinic_network_configs
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- DICOM modalities
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_dicom_modalities') THEN
    CREATE TRIGGER audit_dicom_modalities
      AFTER INSERT OR UPDATE OR DELETE ON public.dicom_modalities
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- DICOM servers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_dicom_servers') THEN
    CREATE TRIGGER audit_dicom_servers
      AFTER INSERT OR UPDATE OR DELETE ON public.dicom_servers
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Newsletter cycles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_newsletter_cycles') THEN
    CREATE TRIGGER audit_newsletter_cycles
      AFTER INSERT OR UPDATE OR DELETE ON public.newsletter_cycles
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Newsletter submissions
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_newsletter_submissions') THEN
    CREATE TRIGGER audit_newsletter_submissions
      AFTER INSERT OR UPDATE OR DELETE ON public.newsletter_submissions
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Department assignments
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_department_assignments') THEN
    CREATE TRIGGER audit_department_assignments
      AFTER INSERT OR UPDATE OR DELETE ON public.department_assignments
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Office365 connections
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_office365_connections') THEN
    CREATE TRIGGER audit_office365_connections
      AFTER INSERT OR UPDATE OR DELETE ON public.office365_connections
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Menu configurations
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_menu_configurations') THEN
    CREATE TRIGGER audit_menu_configurations
      AFTER INSERT OR UPDATE OR DELETE ON public.menu_configurations
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;

  -- Department templates
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_department_templates') THEN
    CREATE TRIGGER audit_department_templates
      AFTER INSERT OR UPDATE OR DELETE ON public.department_templates
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
  END IF;
END $$;