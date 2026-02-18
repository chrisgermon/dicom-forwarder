import { useState, useEffect } from 'react';
// Auth disabled for single-tenant mode
// import { useAuth } from '@/hooks/useAuth';
// import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserPermission {
  id: string;
  permission: string;
  granted: boolean;
}

interface UserPermissionsManagerProps {
  userId: string;
  companyId: string;
  userName: string;
}

const PERMISSION_CATEGORIES = {
  requests: {
    title: 'Requests',
    permissions: [
      { key: 'view_requests', label: 'View All Requests', description: 'Can view all requests in the company' },
      { key: 'create_requests', label: 'Create Requests (Generic)', description: 'Generic permission for creating requests' },
      { key: 'approve_requests', label: 'Approve Requests', description: 'Can approve or decline any request type' },
      { key: 'create_hardware_request', label: 'Create Hardware Request', description: 'Can create hardware requests' },
      { key: 'create_toner_request', label: 'Create Toner Request', description: 'Can create toner requests' },
      { key: 'create_user_account_request', label: 'Create User Account Request', description: 'Can create new user account requests' },
      { key: 'create_user_offboarding_request', label: 'Create User Offboarding Request', description: 'Can create user offboarding requests' },
      { key: 'create_marketing_request', label: 'Create Marketing Request', description: 'Can create marketing requests' },
      { key: 'view_hardware_requests', label: 'View Hardware Requests', description: 'Can view all hardware requests' },
      { key: 'view_toner_requests', label: 'View Toner Requests', description: 'Can view all toner requests' },
      { key: 'view_marketing_requests', label: 'View Marketing Requests', description: 'Can view all marketing requests' },
      { key: 'view_user_accounts', label: 'View User Account Requests', description: 'Can view all user account requests' },
      { key: 'view_user_offboarding', label: 'View User Offboarding Requests', description: 'Can view all user offboarding requests' },
      { key: 'manage_marketing_requests', label: 'Manage Marketing Requests', description: 'Can manage and process marketing requests' },
      { key: 'manage_user_accounts', label: 'Manage User Account Requests', description: 'Can manage and process user account requests' },
      { key: 'manage_user_offboarding', label: 'Manage User Offboarding', description: 'Can manage and process offboarding requests' },
      { key: 'view_request_metrics', label: 'View Request Analytics', description: 'Can view request metrics and analytics' },
    ]
  },
  news: {
    title: 'News & Newsletter',
    permissions: [
      { key: 'manage_news', label: 'Manage News (Generic)', description: 'Generic permission for news management' },
      { key: 'create_news_article', label: 'Create News Article', description: 'Can create draft news articles' },
      { key: 'publish_news_article', label: 'Publish News Article', description: 'Can publish news articles' },
      { key: 'delete_news_article', label: 'Delete News Article', description: 'Can delete news articles' },
      { key: 'manage_newsletter', label: 'Manage Newsletter', description: 'Can manage monthly newsletters' },
      { key: 'create_newsletter_submission', label: 'Create Newsletter Submission', description: 'Can submit content for newsletter' },
      { key: 'review_newsletter_submission', label: 'Review Newsletter Submissions', description: 'Can review and approve newsletter submissions' },
      { key: 'export_newsletter', label: 'Export Newsletter', description: 'Can export newsletters for distribution' },
    ]
  },
  users: {
    title: 'User Management',
    permissions: [
      { key: 'manage_users', label: 'Manage Users', description: 'Can manage user accounts and roles' },
      { key: 'create_user_invite', label: 'Create User Invite', description: 'Can invite new users to the platform' },
      { key: 'revoke_user_invite', label: 'Revoke User Invite', description: 'Can revoke pending user invites' },
      { key: 'resend_user_invite', label: 'Resend User Invite', description: 'Can resend user invitation emails' },
      { key: 'view_company_directory', label: 'View Company Directory', description: 'Can view the company directory' },
      { key: 'manage_company_directory', label: 'Manage Company Directory', description: 'Can manage company directory entries' },
    ]
  },
  company: {
    title: 'Company Settings',
    permissions: [
      { key: 'manage_company', label: 'Manage Company (Generic)', description: 'Generic permission for company management' },
      { key: 'manage_company_settings', label: 'Manage Company Settings', description: 'Can update company settings and branding' },
      { key: 'manage_company_locations', label: 'Manage Company Locations', description: 'Can manage company locations' },
      { key: 'manage_company_domains', label: 'Manage Company Domains', description: 'Can manage verified domains' },
      { key: 'manage_company_features', label: 'Manage Company Features', description: 'Can enable/disable company features' },
      { key: 'manage_role_permissions', label: 'Manage Role Permissions', description: 'Can configure role-based permissions' },
      { key: 'manage_user_permissions', label: 'Manage User Permissions', description: 'Can set user-specific permission overrides' },
      { key: 'manage_workflows', label: 'Manage Workflows', description: 'Can configure approval workflows' },
    ]
  },
  integrations: {
    title: 'Integrations',
    permissions: [
      { key: 'manage_office365', label: 'Manage Office 365', description: 'Can configure Office 365 integration' },
      { key: 'sync_office365_users', label: 'Sync Office 365 Users', description: 'Can sync users from Office 365' },
      { key: 'manage_sharepoint', label: 'Manage SharePoint', description: 'Can configure SharePoint integration' },
      { key: 'manage_halo_integration', label: 'Manage Halo Integration', description: 'Can configure Halo PSA integration' },
    ]
  },
  modality: {
    title: 'Modality & Network',
    permissions: [
      { key: 'view_modality_management', label: 'View Modality Management', description: 'Can view modality configurations' },
      { key: 'manage_modality', label: 'Manage Modality', description: 'Can manage DICOM modality settings' },
      { key: 'manage_clinic_network', label: 'Manage Clinic Network', description: 'Can manage clinic network configurations' },
      { key: 'share_clinic_details', label: 'Share Clinic Details', description: 'Can create shareable clinic detail links' },
    ]
  },
  system: {
    title: 'System & Analytics',
    permissions: [
      { key: 'view_audit_logs', label: 'View Audit Logs', description: 'Can view system audit logs' },
      { key: 'view_dashboard_analytics', label: 'View Dashboard Analytics', description: 'Can view dashboard analytics' },
      { key: 'manage_system_banners', label: 'Manage System Banners', description: 'Can create and manage system-wide banners' },
      { key: 'manage_system_status', label: 'Manage System Status', description: 'Can update system status indicators' },
      { key: 'manage_notifications', label: 'Manage Notifications', description: 'Can manage notification settings' },
      { key: 'send_notifications', label: 'Send Notifications', description: 'Can send notifications to users' },
    ]
  },
  documentation: {
    title: 'Documentation',
    permissions: [
      { key: 'view_documentation', label: 'View Documentation', description: 'Can view company documentation' },
      { key: 'manage_documentation', label: 'Manage Documentation', description: 'Can create and edit documentation' },
    ]
  },
  knowledgeBase: {
    title: 'Knowledge Base',
    permissions: [
      { key: 'view_knowledge_base', label: 'View Knowledge Base', description: 'Can access and view knowledge base pages' },
      { key: 'create_kb_page', label: 'Create KB Page', description: 'Can create new knowledge base pages' },
      { key: 'edit_kb_page', label: 'Edit KB Page', description: 'Can edit existing knowledge base pages' },
      { key: 'delete_kb_page', label: 'Delete KB Page', description: 'Can delete knowledge base pages' },
      { key: 'manage_kb_workspace', label: 'Manage KB Workspaces', description: 'Can create and manage knowledge base workspaces' },
      { key: 'share_kb_page', label: 'Share KB Page', description: 'Can share knowledge base pages externally' },
      { key: 'manage_kb_templates', label: 'Manage KB Templates', description: 'Can create and manage page templates' },
    ]
  },
  hrAndEAP: {
    title: 'HR & Employee Assistance',
    permissions: [
      { key: 'view_hr_documents', label: 'View HR Documents', description: 'Can access HR policies and forms' },
      { key: 'access_eap_program', label: 'Access EAP Program', description: 'Can access Employee Assistance Program information' },
      { key: 'view_employee_assistance', label: 'View Employee Assistance', description: 'Can view employee assistance resources' },
      { key: 'manage_hr_documents', label: 'Manage HR Documents', description: 'Can upload and manage HR documents' },
      { key: 'report_workplace_incident', label: 'Report Workplace Incident', description: 'Can report workplace incidents' },
    ]
  },
};

// PERMISSIONS list derived from categories when needed

export function UserPermissionsManager({ userId, companyId, userName }: UserPermissionsManagerProps) {
  void userId; void companyId; // Used for API calls when enabled
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  void setSaving; // Will be used when feature is enabled
  const [permissions, setPermissions] = useState<Map<string, UserPermission>>(new Map());
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, [userId, companyId]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      // User permissions disabled for single-tenant mode
      setPermissions(new Map());

    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionKey: string, granted: boolean) => {
    const newPendingChanges = new Map(pendingChanges);
    
    if (granted) {
      // Add to pending changes
      newPendingChanges.set(permissionKey, true);
    } else {
      // Check if permission exists
      const existingPerm = permissions.get(permissionKey);
      if (existingPerm) {
        // Mark for removal (false means revoke)
        newPendingChanges.set(permissionKey, false);
      } else {
        // Was never granted, just remove from pending if it was there
        newPendingChanges.delete(permissionKey);
      }
    }
    
    setPendingChanges(newPendingChanges);
    setHasUnsavedChanges(newPendingChanges.size > 0);
  };

  const saveChanges = async () => {
    // Disabled for single-tenant mode - use role-based permissions instead
    toast({
      title: 'Info',
      description: 'User permission overrides are disabled in single-tenant mode. Use role-based permissions instead.',
    });
    setPendingChanges(new Map());
    setHasUnsavedChanges(false);
  };

  const cancelChanges = () => {
    setPendingChanges(new Map());
    setHasUnsavedChanges(false);
  };

  const clearAllOverrides = async () => {
    // Disabled for single-tenant mode
    toast({
      title: 'Info',
      description: 'User permission overrides are disabled in single-tenant mode. Use role-based permissions instead.',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              User Permissions for {userName}
            </CardTitle>
            <CardDescription>
              Override role-based permissions with user-specific permissions
            </CardDescription>
          </div>
          {permissions.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllOverrides}
              disabled={saving}
            >
              Clear All Overrides
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Permissions set here will override the user's role-based permissions. 
            Leave all toggles off to use default role permissions.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
            <div key={categoryKey} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/90 flex items-center gap-2">
                {category.title}
              </h3>
              <div className="space-y-2">
                {category.permissions.map((perm) => {
                  const userPerm = permissions.get(perm.key);
                  const hasOverride = userPerm !== undefined;
                  const isGranted = userPerm?.granted ?? false;
                  
                  // Check for pending changes
                  const hasPendingChange = pendingChanges.has(perm.key);
                  const pendingValue = pendingChanges.get(perm.key);
                  
                  // Determine the display state
                  const displayChecked = hasPendingChange ? pendingValue : (hasOverride && isGranted);
                  const displayOverride = hasPendingChange ? pendingValue : hasOverride;

                  return (
                    <div
                      key={perm.key}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        displayOverride ? 'bg-accent/50 border-primary' : 'bg-background'
                      } ${hasPendingChange ? 'ring-2 ring-orange-500/50' : ''}`}
                    >
                      <div className="flex-1">
                        <Label htmlFor={perm.key} className="text-sm font-medium cursor-pointer">
                          {perm.label}
                          {displayOverride && !hasPendingChange && (
                            <span className="ml-2 text-xs text-primary">(Override Active)</span>
                          )}
                          {hasPendingChange && (
                            <span className="ml-2 text-xs text-orange-600">(Unsaved Change)</span>
                          )}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">{perm.description}</p>
                      </div>
                      <Switch
                        id={perm.key}
                        checked={displayChecked ?? false}
                        onCheckedChange={(checked) => togglePermission(perm.key, checked)}
                        disabled={saving}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Save/Cancel buttons */}
        {hasUnsavedChanges && (
          <div className="sticky bottom-0 left-0 right-0 bg-background border-t pt-4 mt-6 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={cancelChanges}
              disabled={saving}
            >
              Cancel Changes
            </Button>
            <Button
              onClick={saveChanges}
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save {pendingChanges.size} Change{pendingChanges.size > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
