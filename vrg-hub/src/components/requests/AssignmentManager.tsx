import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface AssignmentManagerProps {
  ticketId: string;
  currentAssignee?: string | null;
}

export function AssignmentManager({ ticketId, currentAssignee }: AssignmentManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-workload'],
    queryFn: async () => {
      // Get all users with manager/admin roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['manager', 'tenant_admin', 'super_admin']);
      
      if (rolesError) throw rolesError;

      // Get unique user IDs
      const uniqueUserIds = Array.from(new Set(userRoles?.map(ur => ur.user_id) || []));
      
      if (uniqueUserIds.length === 0) return [];

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', uniqueUserIds);
      
      if (profilesError) throw profilesError;

      // Get workload for each team member
      const membersWithWorkload = await Promise.all(
        (profiles || []).map(async (member) => {
          const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', member.id)
            .not('status', 'in', '(completed,closed,cancelled)');
          
          return { ...member, workload: count || 0 };
        })
      );

      return membersWithWorkload.sort((a, b) => a.workload - b.workload);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (assigneeId: string) => {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: assigneeId })
        .eq('id', ticketId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['team-workload'] });
      toast({ title: 'Ticket assigned successfully' });
    },
    onError: () => {
      toast({
        title: 'Failed to assign ticket',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  return (
    <Select
      value={currentAssignee || undefined}
      onValueChange={(value) => assignMutation.mutate(value)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Assign to..." />
      </SelectTrigger>
      <SelectContent>
        {teamMembers.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{member.full_name || member.email}</span>
              <Badge variant="secondary" className="ml-auto">
                {member.workload} active
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
