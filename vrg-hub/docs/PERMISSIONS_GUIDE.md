# Comprehensive Permission System Guide

## Overview

This application uses a multi-layered permission system that gives you complete control over what users can see and do:

1. **Feature Flags** - Enable/disable entire features for a company
2. **Role Permissions** - Define what each role can do
3. **Menu Visibility** - Control which menu items appear for each role
4. **User Overrides** - Override permissions for specific users (coming soon)

## Permission Management UI

Super admins can access the **Comprehensive Permission Manager** at `/settings` to:

- Toggle permissions for each role
- Show/hide menu items
- Enable/disable features
- Sync all permissions with one click

## Using Permissions in Code

### 1. Check Permissions in Components

```tsx
import { usePermissions } from "@/hooks/usePermissions";

function MyComponent() {
  const { hasPermission, hasFeature } = usePermissions();
  
  return (
    <>
      {hasPermission('create_hardware_request') && (
        <Button>Create Request</Button>
      )}
      
      {hasFeature('hardware_requests') && (
        <HardwareRequestsSection />
      )}
    </>
  );
}
```

### 2. Guard Content with PermissionGuard

```tsx
import { PermissionGuard } from "@/components/PermissionGuard";

// Single permission
<PermissionGuard permission="approve_requests">
  <ApproveButton />
</PermissionGuard>

// Multiple permissions (any)
<PermissionGuard permission={['approve_hardware_requests', 'approve_marketing_requests']}>
  <ApprovalPanel />
</PermissionGuard>

// Multiple permissions (all required)
<PermissionGuard 
  permission={['manage_users', 'manage_company']} 
  requireAll
>
  <AdminSettings />
</PermissionGuard>

// Feature flag
<PermissionGuard feature="monthly_newsletter">
  <NewsletterModule />
</PermissionGuard>

// Hide instead of showing error
<PermissionGuard permission="manage_users" hideOnDenied>
  <AdminLink />
</PermissionGuard>

// Custom fallback
<PermissionGuard 
  permission="view_analytics"
  fallback={<div>Upgrade to see analytics</div>}
>
  <AnalyticsDashboard />
</PermissionGuard>
```

### 3. Protect Entire Pages

```tsx
import { withPermission } from "@/components/PermissionGuard";

function AdminPage() {
  return <div>Admin Content</div>;
}

export default withPermission(AdminPage, 'manage_company');

// Or with feature check
export default withPermission(
  AdminPage, 
  'manage_company',
  { feature: 'admin_panel' }
);
```

### 4. Check Multiple Permissions

```tsx
const { hasAnyPermission } = usePermissions();

// Check if user has ANY of these permissions
if (hasAnyPermission(['approve_hardware_requests', 'approve_marketing_requests'])) {
  // Show approvals tab
}

// Check if user has ALL of these permissions
if (hasAnyPermission(['manage_users', 'manage_company'], true)) {
  // Show advanced admin features
}
```

### 5. Get All User Permissions

```tsx
const { getAllPermissions, permissions } = usePermissions();

const userPermissions = getAllPermissions();
console.log('User can:', userPermissions);

// Or use the permissions array directly
{permissions.includes('manage_users') && <AdminTools />}
```

### 6. Check Menu Visibility

```tsx
import { useMenuVisibility } from "@/hooks/usePermissions";

const { isVisible } = useMenuVisibility('admin-system');

{isVisible && <AdminMenuItem />}
```

## Available Permissions

### Pages & Views
- `view_dashboard` - Access to dashboard
- `view_own_requests` - View own requests
- `view_all_company_requests` - View all company requests
- `view_request_metrics` - View request analytics
- `view_modality_details` - View modality information
- `view_sharepoint_documents` - Access SharePoint docs
- `view_company_directory` - View company directory

### Request Creation
- `create_hardware_request` - Create hardware requests
- `create_toner_request` - Create toner requests
- `create_marketing_request` - Create marketing requests
- `create_user_account_request` - Create user account requests
- `create_user_offboarding_request` - Create user offboarding requests
- `create_ticket_request` - Submit IT support tickets
- `create_facility_services_request` - Create facility services requests
- `create_office_services_request` - Create office services requests
- `create_accounts_payable_request` - Create accounts payable requests
- `create_finance_request` - Create finance requests
- `create_technology_training_request` - Create technology training requests
- `create_it_service_desk_request` - Create IT service desk requests
- `create_hr_request` - Create HR requests
- `edit_own_drafts` - Edit draft requests

### Approvals
- `approve_hardware_requests` - Approve hardware requests
- `approve_marketing_requests` - Approve marketing requests
- `approve_user_account_requests` - Approve user account requests
- `approve_newsletter_submissions` - Approve newsletter submissions

### Ticket Management
- `view_ticket_queue` - View the unified ticket queue
- `view_ticket_audit_log` - View ticket activity history
- `assign_ticket_requests` - Assign tickets to users
- `start_ticket_requests` - Move tickets into progress
- `resolve_ticket_requests` - Resolve or close tickets
- `manage_ticket_watchers` - Manage ticket watcher lists

### Print Ordering
- `print_ordering.create` - Create print orders
- `print_ordering.read` - View print orders
- `print_ordering.update` - Update print orders
- `print_ordering.delete` - Delete print orders
- `print_ordering.manage` - Full print ordering management

### Staff Roster Converter
- `roster_converter.read` - Use the roster converter
- `roster_converter.manage` - Manage converter settings

### Analytics AI
- `analytics.read` - View AI analytics
- `analytics.manage` - Manage analytics settings

### Clinic Setup Checklists
- `clinic_setup.create` - Create clinic setup checklists
- `clinic_setup.read` - View clinic setup checklists
- `clinic_setup.update` - Update clinic setup checklists
- `clinic_setup.delete` - Delete clinic setup checklists
- `clinic_setup.manage` - Full clinic setup management

### Reminders
- `reminders.create` - Create reminders
- `reminders.read` - View reminders
- `reminders.update` - Update reminders
- `reminders.delete` - Delete reminders
- `reminders.manage` - Full reminder management

### Custom Pages & Modules
- `custom_pages.create` - Create new custom pages
- `custom_pages.read` - View custom pages
- `custom_pages.update` - Edit existing pages
- `custom_pages.delete` - Delete pages
- `custom_pages.publish` - Publish pages for all users

### Modalities
- `modalities.create` - Create modalities
- `modalities.read` - View modalities
- `modalities.update` - Edit modalities
- `modalities.delete` - Delete modalities

### Management
- `manage_company_users` - Manage company users
- `manage_company_directory` - Manage company directory
- `manage_hardware_catalog` - Manage hardware catalog
- `manage_newsletter_cycle` - Manage newsletter cycles
- `configure_company_settings` - Configure company settings
- `manage_company_features` - Manage feature flags

### Integrations
- `manage_office365_integration` - Manage Office 365
- `configure_sharepoint` - Configure SharePoint

### Newsletter
- `submit_newsletter` - Submit newsletter content
- `approve_newsletter_submissions` - Approve submissions
- `manage_newsletter_cycle` - Manage newsletter cycles

## Available Feature Flags

- `hardware_requests` - Hardware request module
- `toner_requests` - Toner request module
- `marketing_requests` - Marketing request module
- `user_accounts` - User account request module
- `monthly_newsletter` - Newsletter module
- `modality_management` - Modality management
- `print_ordering` - Print ordering forms
- `roster_converter` - Staff roster converter
- `analytics_ai` - AI-powered analytics
- `clinic_setup` - Clinic setup checklists
- `reminders` - Reminders system
- `company_directory` - Company directory

## Default Role Permissions

### Requester (Basic User)
- View dashboard
- View own requests
- Create all types of requests
- Edit own drafts
- Submit newsletter content
- View documentation

### Manager
- All Requester permissions
- View all company requests
- Approve all request types
- Manage users and catalogs
- View request metrics

### Tenant Admin
- All permissions enabled by default
- Full control over company settings
- Manage features and integrations
- Configure all systems

### Super Admin
- All permissions across all companies
- Access to global settings
- Cannot be restricted

### Content Editor (User-Level Overrides)
Specific users can be granted content editing permissions regardless of their role:

**Current Content Editors:**
- **Steven Luu** - Full custom_pages and modalities permissions
- **Slav Kotevski** - Full custom_pages and modalities permissions

Content Editor permissions include:
- Create, read, update, delete custom pages
- Publish custom pages
- Create, read, update, delete modalities

## Best Practices

1. **Always use permission checks** for sensitive actions:
   ```tsx
   const { hasPermission } = usePermissions();
   
   const handleDelete = () => {
     if (!hasPermission('manage_catalog')) {
       toast.error('No permission');
       return;
     }
     // Proceed with deletion
   };
   ```

2. **Combine feature flags with permissions**:
   ```tsx
   <PermissionGuard 
     feature="hardware_requests"
     permission="create_hardware_request"
   >
     <CreateRequestButton />
   </PermissionGuard>
   ```

3. **Use hideOnDenied for navigation items**:
   ```tsx
   <PermissionGuard permission="manage_users" hideOnDenied>
     <SidebarMenuItem>User Management</SidebarMenuItem>
   </PermissionGuard>
   ```

4. **Provide fallbacks for better UX**:
   ```tsx
   <PermissionGuard 
     permission="view_analytics"
     fallback={
       <Card>
         <CardContent>
           <p>Analytics is only available to managers and admins.</p>
           <Button>Request Access</Button>
         </CardContent>
       </Card>
     }
   >
     <AnalyticsDashboard />
   </PermissionGuard>
   ```

5. **Sync permissions after major changes**:
   - Use the "Sync Permissions" button in the UI
   - Or run the migration manually if needed

## Database Schema

### role_permissions
- Controls what actions each role can perform
- One record per company + role + permission combination
- `enabled` field toggles the permission

### user_permissions (Coming Soon)
- User-specific permission overrides
- Takes precedence over role permissions
- `granted` field overrides role permission

### menu_configurations
- Controls visibility of menu items
- One record per role + menu item
- `is_visible` field shows/hides menu item

### company_features
- Feature flags to enable/disable modules
- One record per company + feature
- `enabled` field toggles the feature

## Troubleshooting

**Permission not working?**
1. Check if feature flag is enabled
2. Verify role has the permission enabled
3. Check for user override (coming soon)
4. Ensure user is authenticated

**Menu item not showing?**
1. Check menu_configurations for the role
2. Verify `is_visible` is true
3. Check if parent menu item is visible

**Need to add new permission?**
1. Add to PERMISSION_CATEGORIES in ComprehensivePermissionManager
2. Click "Sync Permissions" button
3. Or run migration to add to all companies

## Security Notes

⚠️ **Important:** Permissions are enforced client-side for UI only. Always validate permissions server-side (RLS policies) for actual security.

✅ **Good:** Hide buttons and routes based on permissions
❌ **Bad:** Rely only on client-side checks for security

All database operations should use RLS policies that mirror these permission checks.
