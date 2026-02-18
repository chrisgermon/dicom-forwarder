-- Add missing RLS policies for companies table to allow super admins to manage companies

-- Allow super admins to insert new companies
CREATE POLICY "Super admins can create companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Allow super admins to update companies
CREATE POLICY "Super admins can update companies" 
ON public.companies 
FOR UPDATE 
USING (has_global_role(auth.uid(), 'super_admin'::user_role));

-- Allow super admins to delete companies
CREATE POLICY "Super admins can delete companies" 
ON public.companies 
FOR DELETE 
USING (has_global_role(auth.uid(), 'super_admin'::user_role));