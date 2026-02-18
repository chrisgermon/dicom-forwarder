import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Check, X, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface RBACRolePermissionsMatrixProps {
  roleId: string;
  onUpdate: () => void;
}

type EffectType = 'allow' | 'deny' | null;

export function RBACRolePermissionsMatrix({ roleId, onUpdate }: RBACRolePermissionsMatrixProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Map<string, EffectType>>(new Map());
  const [pendingChanges, setPendingChanges] = useState<Map<string, EffectType>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [roleId]);

  const fetchData = async () => {
    try {
      const [permissionsRes, rolePermsRes] = await Promise.all([
        supabase.from('rbac_permissions').select('*').order('resource').order('action'),
        supabase.from('rbac_role_permissions').select('*').eq('role_id', roleId)
      ]);

      if (permissionsRes.error) throw permissionsRes.error;
      if (rolePermsRes.error) throw rolePermsRes.error;

      setPermissions(permissionsRes.data || []);

      const rolePermsMap = new Map<string, EffectType>();
      (rolePermsRes.data || []).forEach((rp: any) => {
        if (rp.effect === 'allow' || rp.effect === 'deny') {
          rolePermsMap.set(rp.permission_id, rp.effect);
        }
      });
      setRolePermissions(rolePermsMap);
      setPendingChanges(new Map());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load permissions');
    }
  };

  const getEffectiveValue = (permissionId: string): EffectType => {
    if (pendingChanges.has(permissionId)) {
      return pendingChanges.get(permissionId) || null;
    }
    return rolePermissions.get(permissionId) || null;
  };

  const handleToggle = (permissionId: string) => {
    const current = getEffectiveValue(permissionId);
    let next: EffectType;
    
    // Cycle: null -> allow -> deny -> null
    if (current === null) {
      next = 'allow';
    } else if (current === 'allow') {
      next = 'deny';
    } else {
      next = null;
    }

    const newPendingChanges = new Map(pendingChanges);
    newPendingChanges.set(permissionId, next);
    setPendingChanges(newPendingChanges);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      for (const [permissionId, effect] of pendingChanges.entries()) {
        if (effect === null) {
          // Remove permission
          await supabase
            .from('rbac_role_permissions')
            .delete()
            .eq('role_id', roleId)
            .eq('permission_id', permissionId);
        } else {
          // Upsert permission
          await supabase
            .from('rbac_role_permissions')
            .upsert({
              role_id: roleId,
              permission_id: permissionId,
              effect
            }, {
              onConflict: 'role_id,permission_id'
            });
        }
      }

      toast.success('Role permissions saved');
      setPendingChanges(new Map());
      await fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPendingChanges(new Map());
  };

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const hasPendingChanges = pendingChanges.size > 0;

  const EffectButton = ({ effect, onClick, isPending }: { effect: EffectType; onClick: () => void; isPending: boolean }) => {
    const baseClasses = "relative h-10 px-4 rounded-md border-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 font-medium text-sm";
    
    if (effect === 'allow') {
      return (
        <button
          onClick={onClick}
          className={cn(
            baseClasses,
            "bg-success/10 border-success text-success hover:bg-success/20",
            isPending && "ring-2 ring-success ring-offset-2"
          )}
        >
          <Check className="w-4 h-4 inline mr-1" />
          Allow
        </button>
      );
    }
    
    if (effect === 'deny') {
      return (
        <button
          onClick={onClick}
          className={cn(
            baseClasses,
            "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20",
            isPending && "ring-2 ring-destructive ring-offset-2"
          )}
        >
          <X className="w-4 h-4 inline mr-1" />
          Deny
        </button>
      );
    }
    
    return (
      <button
        onClick={onClick}
        className={cn(
          baseClasses,
          "bg-muted border-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/10",
          isPending && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <Minus className="w-4 h-4 inline mr-1" />
        None
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([resource, perms]) => (
          <div key={resource} className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-3 border-b">
              <h3 className="font-semibold text-sm uppercase tracking-wide font-mono">
                {resource}
              </h3>
            </div>
            <div className="divide-y">
              {perms.map((permission) => {
                const effect = getEffectiveValue(permission.id);
                const isPending = pendingChanges.has(permission.id);

                return (
                  <div
                    key={permission.id}
                    className={cn(
                      "flex items-center justify-between p-4 hover:bg-muted/30 transition-colors",
                      isPending && "bg-primary/5"
                    )}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-3">
                        <code className="text-sm font-mono font-medium">
                          {permission.action}
                        </code>
                        {isPending && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            Modified
                          </span>
                        )}
                      </div>
                      {permission.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {permission.description}
                        </p>
                      )}
                    </div>
                    <EffectButton
                      effect={effect}
                      onClick={() => handleToggle(permission.id)}
                      isPending={isPending}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {hasPendingChanges && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t pt-4 pb-2 -mx-6 px-6">
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={loading} className="flex-1" size="lg">
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : `Save ${pendingChanges.size} Changes`}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              size="lg"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
