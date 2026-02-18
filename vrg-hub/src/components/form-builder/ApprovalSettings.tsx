import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface ApprovalSettingsProps {
  requireApproval: boolean;
  approverId: string | null;
  onRequireApprovalChange: (enabled: boolean) => void;
  onApproverIdChange: (id: string | null) => void;
}

export function ApprovalSettings({
  requireApproval,
  approverId,
  onRequireApprovalChange,
  onApproverIdChange,
}: ApprovalSettingsProps) {
  const [approvers, setApprovers] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadApprovers();
  }, []);

  const loadApprovers = async () => {
    // Get role IDs for manager, tenant_admin, and super_admin
    const { data: roleData, error: roleError } = await supabase
      .from('rbac_roles')
      .select('id, name')
      .in('name', ['manager', 'tenant_admin', 'super_admin']);

    if (roleError) {
      console.error('Error loading roles:', roleError);
      return;
    }

    const roleIds = roleData?.map(r => r.id) || [];

    // Get users with manager or admin roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('rbac_user_roles')
      .select('user_id')
      .in('role_id', roleIds);

    if (rolesError) {
      console.error('Error loading user roles:', rolesError);
      return;
    }

    const userIds = userRoles?.map(ur => ur.user_id) || [];

    if (userIds.length === 0) {
      setApprovers([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
      .order('full_name');

    if (error) {
      console.error('Error loading approvers:', error);
      return;
    }

    setApprovers(data || []);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <UserCheck className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Approval Settings</h3>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="require-approval" className="text-sm font-medium">
            Require Approval
          </Label>
          <p className="text-xs text-muted-foreground">
            Requests using this form will need approval before processing
          </p>
        </div>
        <Switch
          id="require-approval"
          checked={requireApproval}
          onCheckedChange={onRequireApprovalChange}
        />
      </div>

      {requireApproval && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Default Approver
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {approverId
                  ? approvers.find((approver) => approver.id === approverId)?.full_name || 
                    approvers.find((approver) => approver.id === approverId)?.email
                  : "Auto-assign based on location/brand"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search by name or email..." />
                <CommandEmpty>No approver found.</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-auto">
                  <CommandItem
                    value="auto"
                    onSelect={() => {
                      onApproverIdChange(null);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !approverId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Auto-assign based on location/brand
                  </CommandItem>
                  {approvers.map((approver) => (
                    <CommandItem
                      key={approver.id}
                      value={`${approver.full_name} ${approver.email}`}
                      onSelect={() => {
                        onApproverIdChange(approver.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          approverId === approver.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{approver.full_name}</span>
                        <span className="text-xs text-muted-foreground">{approver.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            {approverId 
              ? 'All requests will be sent to the selected approver'
              : 'System will automatically assign approver based on requester\'s brand and location'}
          </p>
        </div>
      )}
    </div>
  );
}
