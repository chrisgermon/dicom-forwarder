
-- Fix the existing user ahe@pinnaclemi.com.au
-- First create their profile
INSERT INTO public.profiles (user_id, company_id, name, email)
VALUES (
  '906bf04f-ce1b-4a52-85cf-f8f5c6b23d09',
  '977643d1-102e-49f5-ae6e-0980651e80c0',
  'AHE User',
  'ahe@pinnaclemi.com.au'
)
ON CONFLICT (user_id) DO UPDATE
SET company_id = EXCLUDED.company_id,
    email = EXCLUDED.email;

-- Create company membership
INSERT INTO public.company_memberships (user_id, company_id, status, is_primary)
VALUES (
  '906bf04f-ce1b-4a52-85cf-f8f5c6b23d09',
  '977643d1-102e-49f5-ae6e-0980651e80c0',
  'active',
  true
)
ON CONFLICT (user_id, company_id) DO UPDATE
SET status = 'active',
    is_primary = true;

-- Assign manager role (approver in membership_roles)
INSERT INTO public.membership_roles (membership_id, role)
SELECT 
  cm.id,
  'approver'
FROM public.company_memberships cm
WHERE cm.user_id = '906bf04f-ce1b-4a52-85cf-f8f5c6b23d09'
  AND cm.company_id = '977643d1-102e-49f5-ae6e-0980651e80c0'
ON CONFLICT (membership_id, role) DO NOTHING;

-- Now fix the handle_new_user trigger to work with the new schema
-- This will ensure future users are set up correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_domain TEXT;
  matching_company_id UUID;
  pending_invite RECORD;
  new_membership_id UUID;
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
    
    -- Create company membership
    INSERT INTO public.company_memberships (user_id, company_id, status, is_primary)
    VALUES (NEW.id, matching_company_id, 'active', true)
    RETURNING id INTO new_membership_id;
    
    -- Map old role system to new membership_roles
    -- pending_invite.role is from the old system (requester, manager, tenant_admin, etc.)
    IF pending_invite.role = 'tenant_admin' THEN
      INSERT INTO public.membership_roles (membership_id, role)
      VALUES (new_membership_id, 'company_admin');
    ELSIF pending_invite.role = 'manager' OR pending_invite.role = 'marketing_manager' THEN
      INSERT INTO public.membership_roles (membership_id, role)
      VALUES (new_membership_id, 'approver');
    ELSE
      -- Default to requester role
      INSERT INTO public.membership_roles (membership_id, role)
      VALUES (new_membership_id, 'requester');
    END IF;
    
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
    
    -- Create company membership with default requester role
    INSERT INTO public.company_memberships (user_id, company_id, status, is_primary)
    VALUES (NEW.id, matching_company_id, 'active', true)
    RETURNING id INTO new_membership_id;
    
    -- Assign default role (requester)
    INSERT INTO public.membership_roles (membership_id, role)
    VALUES (new_membership_id, 'requester');
  END IF;
  
  RETURN NEW;
END;
$$;
