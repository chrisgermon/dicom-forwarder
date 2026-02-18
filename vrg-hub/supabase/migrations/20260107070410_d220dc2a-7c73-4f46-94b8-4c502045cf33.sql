-- =====================================================
-- Phase 1: Security Hardening - Fix Permissive RLS Policies
-- =====================================================

-- Helper function to check if user is admin/manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'tenant_admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Fix file_documents policies
-- =====================================================

-- Drop the permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete shared documents" ON file_documents;
DROP POLICY IF EXISTS "Authenticated users can update shared documents" ON file_documents;
DROP POLICY IF EXISTS "Authenticated users can upload shared documents" ON file_documents;

-- Create proper policies with ownership checks
CREATE POLICY "Users can upload documents"
ON file_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own documents or admins can update any"
ON file_documents FOR UPDATE
TO authenticated
USING (
  auth.uid() = uploaded_by 
  OR public.is_admin_or_manager()
);

CREATE POLICY "Users can delete their own documents or admins can delete any"
ON file_documents FOR DELETE
TO authenticated
USING (
  auth.uid() = uploaded_by 
  OR public.is_admin_or_manager()
);

-- =====================================================
-- Fix kb_videos policies
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can upload videos" ON kb_videos;

CREATE POLICY "Admins can upload videos"
ON kb_videos FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_manager());

-- =====================================================
-- Fix knowledge_base_categories policies
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can delete categories" ON knowledge_base_categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON knowledge_base_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON knowledge_base_categories;

CREATE POLICY "Admins can insert categories"
ON knowledge_base_categories FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins can update categories"
ON knowledge_base_categories FOR UPDATE
TO authenticated
USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete categories"
ON knowledge_base_categories FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- =====================================================
-- Fix knowledge_base_pages policies
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can delete pages" ON knowledge_base_pages;
DROP POLICY IF EXISTS "Authenticated users can insert pages" ON knowledge_base_pages;
DROP POLICY IF EXISTS "Authenticated users can update pages" ON knowledge_base_pages;

CREATE POLICY "Admins can insert pages"
ON knowledge_base_pages FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins can update pages"
ON knowledge_base_pages FOR UPDATE
TO authenticated
USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete pages"
ON knowledge_base_pages FOR DELETE
TO authenticated
USING (public.is_admin_or_manager());

-- =====================================================
-- Add performance indexes for audit_logs and tickets
-- =====================================================

-- Index for audit log queries by time and table
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_table 
ON audit_logs (created_at DESC, table_name);

-- Index for ticket queue filtering
CREATE INDEX IF NOT EXISTS idx_tickets_status_created 
ON tickets (status, created_at DESC);

-- Index for ticket assignment lookups
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to 
ON tickets (assigned_to) WHERE assigned_to IS NOT NULL;

-- Index for user's tickets
CREATE INDEX IF NOT EXISTS idx_tickets_user_id_created 
ON tickets (user_id, created_at DESC);