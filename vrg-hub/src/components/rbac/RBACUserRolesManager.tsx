import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Save } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface RBACUserRolesManagerProps {
  userId: string;
  currentRoles: Array<{ id: string; name: string }>;
  onUpdate: () => void;
}

export function RBACUserRolesManager({ userId, currentRoles, onUpdate }: RBACUserRolesManagerProps) {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(currentRoles.map(r => r.id)));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('rbac_roles')
        .select('id, name, description')
        .order('name');

      if (error) throw error;
      setAvailableRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const handleRoleToggle = (roleId: string) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(roleId)) {
      newSelected.delete(roleId);
    } else {
      newSelected.add(roleId);
    }
    setSelectedRoles(newSelected);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Remove all existing roles
      const { error: deleteError } = await supabase
        .from('rbac_user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Add selected roles
      if (selectedRoles.size > 0) {
        const { error: insertError } = await supabase
          .from('rbac_user_roles')
          .insert(
            Array.from(selectedRoles).map(roleId => ({
              user_id: userId,
              role_id: roleId
            }))
          );

        if (insertError) throw insertError;
      }

      toast.success('User roles updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Error updating user roles:', error);
      toast.error('Failed to update user roles');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {availableRoles.map((role) => (
          <div key={role.id} className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-muted/50">
            <Checkbox
              id={`role-${role.id}`}
              checked={selectedRoles.has(role.id)}
              onCheckedChange={() => handleRoleToggle(role.id)}
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor={`role-${role.id}`}
                className="flex items-center gap-2 cursor-pointer font-medium"
              >
                <Shield className="w-4 h-4" />
                {role.name}
              </Label>
              {role.description && (
                <p className="text-sm text-muted-foreground">{role.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={loading} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {loading ? 'Saving...' : 'Save Roles'}
      </Button>
    </div>
  );
}
