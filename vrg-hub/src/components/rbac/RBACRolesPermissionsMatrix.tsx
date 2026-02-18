import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Types
interface Role {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

type EffectType = 'allow' | 'deny' | null;

type RolePermKey = `${string}:${string}`; // `${roleId}:${permissionId}`

export function RBACRolesPermissionsMatrix() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<Map<RolePermKey, EffectType>>(new Map());
  const [pending, setPending] = useState<Map<RolePermKey, EffectType>>(new Map());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
        supabase.from('rbac_roles').select('id,name').order('name'),
        supabase.from('rbac_permissions').select('*').order('resource').order('action'),
        supabase.from('rbac_role_permissions').select('role_id, permission_id, effect'),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;
      if (rolePermsRes.error) throw rolePermsRes.error;

      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);

      const map = new Map<RolePermKey, EffectType>();
      (rolePermsRes.data || []).forEach((rp: any) => {
        if (rp.effect === 'allow' || rp.effect === 'deny') {
          map.set(`${rp.role_id}:${rp.permission_id}`, rp.effect);
        }
      });
      setRolePerms(map);
      setPending(new Map());
    } catch (e) {
      console.error('Failed to load matrix data', e);
      toast.error('Failed to load roles/permissions');
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    (permissions || []).forEach((p) => {
      if (filter && !(`${p.resource}:${p.action}`.toLowerCase().includes(filter.toLowerCase()))) return;
      if (!groups[p.resource]) groups[p.resource] = [];
      groups[p.resource].push(p);
    });
    return groups;
  }, [permissions, filter]);

  const getEffective = (roleId: string, permId: string): EffectType => {
    const key: RolePermKey = `${roleId}:${permId}`;
    if (pending.has(key)) return pending.get(key)!;
    return rolePerms.get(key) || null;
  };

  const setEffect = (roleId: string, permId: string, next: EffectType) => {
    const key: RolePermKey = `${roleId}:${permId}`;
    const updated = new Map(pending);
    updated.set(key, next);
    setPending(updated);
  };

  const onToggle = (roleId: string, permId: string) => {
    const cur = getEffective(roleId, permId);
    // Toggle: if 'allow', set to null (deny), otherwise set to 'allow'
    const next: EffectType = cur === 'allow' ? null : 'allow';
    setEffect(roleId, permId, next);
  };

  const hasChanges = pending.size > 0;

  const saveChanges = async () => {
    if (!hasChanges) return;
    setLoading(true);
    try {
      // Persist each pending change
      const ops = Array.from(pending.entries()).map(async ([key, effect]) => {
        const [roleId, permId] = key.split(':');
        if (!effect) {
          return supabase
            .from('rbac_role_permissions')
            .delete()
            .eq('role_id', roleId)
            .eq('permission_id', permId);
        }
        return supabase
          .from('rbac_role_permissions')
          .upsert(
            { role_id: roleId, permission_id: permId, effect },
            { onConflict: 'role_id,permission_id' }
          );
      });

      const results = await Promise.all(ops);
      const err = results.find((r) => (r as any).error);
      if (err && (err as any).error) throw (err as any).error;

      toast.success('Permissions matrix saved');
      await loadData();
    } catch (e) {
      console.error('Failed to save matrix', e);
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const discardChanges = () => setPending(new Map());

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Permissions Matrix</CardTitle>
              <CardDescription>Checked = Allow, Unchecked = Deny</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filter by resource or action..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-[280px]"
              />
              <Button variant="outline" onClick={loadData} disabled={loading}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/*
            NOTE: <Table /> wraps the actual <table> in an internal div with `overflow-auto`.
            We set max-height on that internal wrapper so sticky headers work against the real scroll container.
          */}
          <div className="[&>div]:max-h-[calc(100vh-300px)]">
            <Table>
              <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-background [&_th]:border-b">
                <TableRow>
                  <TableHead className="min-w-[260px]">Permission</TableHead>
                  {roles.map((r) => (
                    <TableHead key={r.id} className="text-center min-w-[160px]">
                      {r.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <React.Fragment key={resource}>
                    <TableRow>
                      <TableCell
                        colSpan={1 + roles.length}
                        className="bg-muted font-mono text-xs uppercase tracking-wide"
                      >
                        {resource}
                      </TableCell>
                    </TableRow>
                    {perms.map((p) => (
                      <TableRow key={p.id} className="align-top">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm">{p.action}</span>
                            {p.description && (
                              <span className="text-xs text-muted-foreground mt-1">{p.description}</span>
                            )}
                          </div>
                        </TableCell>
                        {roles.map((r) => {
                          const val = getEffective(r.id, p.id);
                          const isChecked = val === 'allow';
                          const key = `${r.id}:${p.id}` as RolePermKey;
                          const isModified = pending.has(key);
                          return (
                            <TableCell key={r.id + p.id} className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => onToggle(r.id, p.id)}
                                  aria-label={`${r.name} - ${p.resource}:${p.action}`}
                                />
                                {isModified && (
                                  <span className="text-[10px] text-primary font-medium">Modified</span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
                {!loading && permissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={1 + roles.length} className="text-center text-muted-foreground">
                      No permissions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t pt-3 pb-3 -mx-6 px-6">
          <div className="flex items-center gap-3">
            <Button onClick={saveChanges} disabled={loading} className="flex-1">
              {loading ? 'Saving…' : `Save ${pending.size} Change${pending.size > 1 ? 's' : ''}`}
            </Button>
            <Button variant="outline" onClick={discardChanges} disabled={loading}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
