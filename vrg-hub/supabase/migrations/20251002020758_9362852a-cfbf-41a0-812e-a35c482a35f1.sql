-- Create invites table
CREATE TABLE public.user_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'requester',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invite_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(email, company_id)
);

-- Enable RLS
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Global admins can manage all invites
CREATE POLICY "Super admins can manage all invites"
ON public.user_invites
FOR ALL
USING (has_global_role(auth.uid(), 'super_admin'));

-- Tenant admins can manage company invites
CREATE POLICY "Tenant admins can manage company invites"
ON public.user_invites
FOR ALL
USING (has_role(auth.uid(), company_id, 'tenant_admin'));

-- Update handle_new_user function to check for invites first
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email TEXT;
  user_domain TEXT;
  matching_company_id UUID;
  pending_invite RECORD;
BEGIN
  -- Extract email from user metadata or email field
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email');
  
  IF user_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check for pending invite first
  SELECT * INTO pending_invite
  FROM public.user_invites
  WHERE email = user_email
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
  
  IF pending_invite.id IS NOT NULL THEN
    -- Use invite details
    matching_company_id := pending_invite.company_id;
    
    -- Create user profile
    INSERT INTO public.profiles (user_id, company_id, name, email)
    VALUES (
      NEW.id, 
      matching_company_id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
      user_email
    );
    
    -- Assign role from invite
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (NEW.id, matching_company_id, pending_invite.role);
    
    -- Mark invite as accepted
    UPDATE public.user_invites
    SET status = 'accepted', accepted_at = now()
    WHERE id = pending_invite.id;
    
    RETURN NEW;
  END IF;
  
  -- Fallback to domain matching (existing logic)
  user_domain := split_part(user_email, '@', 2);
  
  SELECT cd.company_id INTO matching_company_id
  FROM public.company_domains cd
  JOIN public.companies c ON c.id = cd.company_id
  WHERE cd.domain = user_domain 
    AND cd.active = true 
    AND c.active = true
  LIMIT 1;
  
  IF matching_company_id IS NOT NULL THEN
    -- Create user profile
    INSERT INTO public.profiles (user_id, company_id, name, email)
    VALUES (
      NEW.id, 
      matching_company_id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
      user_email
    );
    
    -- Assign default role (requester)
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (NEW.id, matching_company_id, 'requester');
  END IF;
  
  RETURN NEW;
END;
$function$;