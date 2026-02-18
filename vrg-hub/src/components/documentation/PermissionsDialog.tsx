import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Lock, Link as LinkIcon, User as UserIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Permission {
  id: string;
  roles: string[];
  grantedTo?: Array<{
    displayName: string;
    email?: string;
    type: 'user' | 'group';
  }>;
  link?: {
    type: string;
    scope: string;
  };
}

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  permissions?: Permission[];
}

export function PermissionsDialog({
  open,
  onOpenChange,
  itemName,
  permissions = [],
}: PermissionsDialogProps) {
  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { variant: 'default' | 'secondary' | 'destructive', label: string }> = {
      'read': { variant: 'secondary', label: 'Read' },
      'write': { variant: 'default', label: 'Edit' },
      'owner': { variant: 'destructive', label: 'Owner' },
    };
    
    const config = roleMap[role.toLowerCase()] || { variant: 'default', label: role };
    return (
      <Badge variant={config.variant} className="ml-2">
        {config.label}
      </Badge>
    );
  };

  const linkPermissions = permissions.filter(p => p.link);
  const userGroupPermissions = permissions.filter(p => p.grantedTo && p.grantedTo.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Permissions for {itemName}
          </DialogTitle>
          <DialogDescription>
            View who has access to this item and their permission levels
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-6">
            {/* Link Sharing */}
            {linkPermissions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Shared Links
                </h3>
                <div className="space-y-2">
                  {linkPermissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="p-3 border rounded-lg bg-muted/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {perm.link?.type === 'view' ? 'View Link' : 'Edit Link'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Scope: {perm.link?.scope || 'Unknown'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {perm.roles.map((role, i) => (
                          <span key={i}>{getRoleBadge(role)}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct User/Group Permissions */}
            {userGroupPermissions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Direct Access
                </h3>
                <div className="space-y-2">
                  {userGroupPermissions.map((perm) => (
                    <div key={perm.id} className="space-y-2">
                      {perm.grantedTo?.map((identity, idx) => (
                        <div
                          key={idx}
                          className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {identity.type === 'user' ? (
                              <UserIcon className="h-4 w-4 text-primary" />
                            ) : (
                              <Users className="h-4 w-4 text-primary" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{identity.displayName}</p>
                              {identity.email && (
                                <p className="text-xs text-muted-foreground">{identity.email}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {perm.roles.map((role, i) => (
                              <span key={i}>{getRoleBadge(role)}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Permissions */}
            {permissions.length === 0 && (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No permission information available for this item
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
