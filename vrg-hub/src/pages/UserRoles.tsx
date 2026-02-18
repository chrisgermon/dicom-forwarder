import { TabsContent } from "@/components/ui/tabs";
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs";
import { EnhancedUserManagement } from "@/components/admin/EnhancedUserManagement";
import { RBACRoleManagement } from "@/components/rbac/RBACRoleManagement";
import { RBACPermissionsCatalog } from "@/components/rbac/RBACPermissionsCatalog";
import { RBACAccessPlayground } from "@/components/rbac/RBACAccessPlayground";
import { RBACAuditLog } from "@/components/rbac/RBACAuditLog";
import { RBACRolesPermissionsMatrix } from "@/components/rbac/RBACRolesPermissionsMatrix";
import { Users, Shield, Key, PlayCircle, FileText, Table } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";

export default function UserRoles() {
  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <UnderlineTabs defaultValue="users" className="space-y-6">
        <UnderlineTabsList className="flex flex-wrap gap-0">
          <UnderlineTabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Permissions
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="matrix" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Matrix
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="playground" className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4" />
            Test Access
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Audit Log
          </UnderlineTabsTrigger>
        </UnderlineTabsList>

        <TabsContent value="users">
          <EnhancedUserManagement />
        </TabsContent>

        <TabsContent value="roles">
          <RBACRoleManagement />
        </TabsContent>

        <TabsContent value="permissions">
          <RBACPermissionsCatalog />
        </TabsContent>

        <TabsContent value="matrix">
          <RBACRolesPermissionsMatrix />
        </TabsContent>
 
        <TabsContent value="playground">
          <RBACAccessPlayground />
        </TabsContent>

        <TabsContent value="audit">
          <RBACAuditLog />
        </TabsContent>
      </UnderlineTabs>
    </PageContainer>
  );
}