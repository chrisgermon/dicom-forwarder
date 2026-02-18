-- Create companies/tenants table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  subdomain TEXT UNIQUE,
  billing_contact_email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company domains table for email domain validation
CREATE TABLE public.company_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, domain)
);

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('requester', 'manager', 'tenant_admin', 'super_admin');

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'requester',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _company_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = _role
  )
$$;

-- Create function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- RLS Policies for companies
CREATE POLICY "Super admins can view all companies" 
ON public.companies FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Tenant users can view their company" 
ON public.companies FOR SELECT 
USING (
  id = public.get_user_company(auth.uid())
);

-- RLS Policies for company_domains
CREATE POLICY "Super admins can manage all domains" 
ON public.company_domains FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Tenant admins can manage their domains" 
ON public.company_domains FOR ALL 
USING (
  public.has_role(auth.uid(), company_id, 'tenant_admin')
);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Tenant admins can view company profiles" 
ON public.profiles FOR SELECT 
USING (
  public.has_role(auth.uid(), company_id, 'tenant_admin')
);

-- RLS Policies for user_roles
CREATE POLICY "Super admins can manage all roles" 
ON public.user_roles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  )
);

CREATE POLICY "Tenant admins can manage company roles" 
ON public.user_roles FOR ALL 
USING (
  public.has_role(auth.uid(), company_id, 'tenant_admin')
);

CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (user_id = auth.uid());

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_domain TEXT;
  matching_company_id UUID;
BEGIN
  -- Extract email from user metadata or email field
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email');
  
  IF user_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Extract domain from email
  user_domain := split_part(user_email, '@', 2);
  
  -- Find matching company by domain
  SELECT cd.company_id INTO matching_company_id
  FROM public.company_domains cd
  JOIN public.companies c ON c.id = cd.company_id
  WHERE cd.domain = user_domain 
    AND cd.active = true 
    AND c.active = true
  LIMIT 1;
  
  -- Only create profile if domain matches a company
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
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create update trigger for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.companies (name, slug, subdomain, billing_contact_email) VALUES
  ('Acme Corporation', 'acme', 'acme', 'billing@acme.com'),
  ('TechStart Inc', 'techstart', 'techstart', 'billing@techstart.com'),
  ('Global Enterprises', 'global', 'global', 'billing@global-ent.com');

INSERT INTO public.company_domains (company_id, domain) VALUES
  ((SELECT id FROM public.companies WHERE slug = 'acme'), 'acme.com'),
  ((SELECT id FROM public.companies WHERE slug = 'acme'), 'acmecorp.com'),
  ((SELECT id FROM public.companies WHERE slug = 'techstart'), 'techstart.com'),
  ((SELECT id FROM public.companies WHERE slug = 'techstart'), 'techstart.io'),
  ((SELECT id FROM public.companies WHERE slug = 'global'), 'global-ent.com'),
  ((SELECT id FROM public.companies WHERE slug = 'global'), 'globalenterprises.com');