import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedUserManagement } from '@/components/admin/EnhancedUserManagement';
import { UserInviteManager } from '@/components/UserInviteManager';
import { Office365UserSync } from './Office365UserSync';
import { Users, Mail, Cloud } from 'lucide-react';

export function UsersSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Users & Roles</h2>
        <p className="text-muted-foreground">
          Manage users, roles, and sync with Office 365/Azure AD
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-2">
            <Mail className="h-4 w-4" />
            User Invites
          </TabsTrigger>
          <TabsTrigger value="office365" className="gap-2">
            <Cloud className="h-4 w-4" />
            Office 365 Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <EnhancedUserManagement />
        </TabsContent>

        <TabsContent value="invites">
          <UserInviteManager />
        </TabsContent>

        <TabsContent value="office365">
          <Office365UserSync />
        </TabsContent>
      </Tabs>
    </div>
  );
}
