# RBAC System - Role-Based Access Control

## Overview
Complete RBAC implementation with user management, roles, permissions, and per-user overrides integrated with Office 365/Azure AD.

## Features
✅ **User Management** - Assign multiple roles per user with Azure AD sync
✅ **Role Management** - Define roles with baseline permissions
✅ **Permission Overrides** - Grant/deny specific permissions per user
✅ **Permissions Catalog** - Master list of all resources and actions
✅ **Access Playground** - Test permission evaluation with trace
✅ **Audit Log** - Track all RBAC changes
✅ **Edge Function** - Server-side permission evaluation

## Permission Evaluation Order
1. **User Overrides** (highest priority) - Explicit allow/deny per user
2. **Role Permissions** - Deny beats allow if multiple roles
3. **Default Deny** - No matching rules = denied

## Database Schema
- `rbac_roles` - Role definitions
- `rbac_permissions` - Available permissions (resource:action)
- `rbac_role_permissions` - Permissions assigned to roles
- `rbac_user_roles` - Users assigned to roles
- `rbac_user_permissions` - Per-user overrides
- `rbac_audit_log` - Change tracking

## Usage

### Check Permission in Code
```typescript
import { useRBACPermissions } from '@/hooks/useRBACPermissions';

const { checkPermission } = useRBACPermissions();
const result = await checkPermission('users', 'delete');
if (result.allowed) {
  // Perform action
}
```

### Protect Routes
```typescript
import { RBACProtectedRoute } from '@/components/rbac/RBACProtectedRoute';

<RBACProtectedRoute resource="admin" action="access">
  <AdminPanel />
</RBACProtectedRoute>
```

## Default Roles
- `super_admin` - Full system access
- `tenant_admin` - Company admin
- `manager` - Department manager
- `requester` - Basic user

## Access Management UI
Navigate to **User Roles** page:
- **Users Tab** - Assign roles, set overrides, view effective permissions
- **Roles Tab** - Create/edit roles, configure role permissions
- **Permissions Tab** - Add/edit available permissions
- **Test Access Tab** - Debug permission evaluation
- **Audit Log Tab** - View all RBAC changes

## Next Steps
1. Configure Office 365/Azure AD for SSO
2. Assign roles to users
3. Set up role permissions
4. Use `checkPermission()` in your code
5. Protect sensitive routes with `RBACProtectedRoute`
