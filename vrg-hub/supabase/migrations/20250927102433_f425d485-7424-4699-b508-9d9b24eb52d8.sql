-- Fix security warning: Set proper search_path for all functions
ALTER FUNCTION public.has_role(_user_id UUID, _company_id UUID, _role user_role) 
SET search_path = public;

ALTER FUNCTION public.get_user_company(_user_id UUID) 
SET search_path = public;

ALTER FUNCTION public.handle_new_user() 
SET search_path = public;

ALTER FUNCTION public.update_updated_at_column() 
SET search_path = public;