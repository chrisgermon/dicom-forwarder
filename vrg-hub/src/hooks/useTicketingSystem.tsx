import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestTypes(departmentId?: string) {
  return useQuery({
    queryKey: ['request_types', departmentId],
    queryFn: async () => {
      let query = supabase
        .from('request_types')
        .select('*, department:departments(name)')
        .order('name');
      
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCategories(requestTypeId?: string) {
  return useQuery({
    queryKey: ['request_categories', requestTypeId],
    queryFn: async () => {
      let query = supabase
        .from('request_categories')
        .select(`
          *, 
          request_type:request_types(name),
          form_template:form_templates(id, name, fields)
        `)
        .order('sort_order');
      
      if (requestTypeId) {
        query = query.eq('request_type_id', requestTypeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      // First get teams with members
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_members(*)
        `)
        .order('name');
      
      if (teamsError) throw teamsError;
      if (!teams) return [];

      // Then fetch profile info for each member
      const teamsWithProfiles = await Promise.all(
        teams.map(async (team) => {
          if (!team.team_members || team.team_members.length === 0) {
            return { ...team, team_members: [] };
          }

          const userIds = team.team_members.map((m: any) => m.user_id).filter(Boolean);
          
          if (userIds.length === 0) {
            return { ...team, team_members: team.team_members.map((m: any) => ({ ...m, user: null })) };
          }

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

          return {
            ...team,
            team_members: team.team_members.map((member: any) => ({
              ...member,
              user: profilesMap.get(member.user_id) || null
            }))
          };
        })
      );

      return teamsWithProfiles;
    },
  });
}

export function useRoutingRules(requestTypeId?: string) {
  return useQuery({
    queryKey: ['routing_rules', requestTypeId],
    queryFn: async () => {
      let query = supabase
        .from('routing_rules')
        .select(`
          *,
          request_type:request_types(name),
          team:teams(name)
        `)
        .order('priority');
      
      if (requestTypeId) {
        query = query.eq('request_type_id', requestTypeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTickets(filters?: any) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTicketEvents(ticketId: string) {
  return useQuery({
    queryKey: ['ticket_events', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_events')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('departments').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating department', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('departments').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating department', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateRequestType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('request_types').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request_types'] });
      toast({ title: 'Request type created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating request type', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRequestType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('request_types').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request_types'] });
      toast({ title: 'Request type updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating request type', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('teams').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Team created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating team', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('teams').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Team updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating team', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Team deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting team', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRoutingRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('routing_rules').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing_rules'] });
      toast({ title: 'Routing rule updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating routing rule', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { team_id: string; user_id: string; role_in_team?: string }) => {
      const { error } = await supabase.from('team_members').insert({
        team_id: data.team_id,
        user_id: data.user_id,
        role_in_team: data.role_in_team || 'member',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Team member added successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error adding team member', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Team member removed successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error removing team member', description: error.message, variant: 'destructive' });
    },
  });
}

export function useActiveUsers() {
  return useQuery({
    queryKey: ['active_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('request_categories').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request_categories'] });
      toast({ title: 'Category created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating category', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('request_categories').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request_categories'] });
      toast({ title: 'Category updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating category', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('request_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request_categories'] });
      toast({ title: 'Category deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting category', description: error.message, variant: 'destructive' });
    },
  });
}
