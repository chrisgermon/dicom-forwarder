import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

// Types
export interface MloContact {
  id: string;
  user_id: string;
  clinic_key: number | null;
  referrer_key: number | null;
  contact_type: 'clinic' | 'referrer' | 'practice_manager' | 'other';
  first_name: string;
  last_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  preferred_contact_method: 'email' | 'phone' | 'mobile' | 'in_person' | null;
  notes: string | null;
  tags: string[] | null;
  birthday: string | null;
  interests: string[] | null;
  is_key_decision_maker: boolean;
  is_active: boolean;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MloCommunication {
  id: string;
  user_id: string;
  contact_id: string | null;
  clinic_key: number | null;
  referrer_key: number | null;
  communication_type: 'email' | 'phone_call' | 'meeting' | 'video_call' | 'text' | 'linkedin' | 'other';
  direction: 'inbound' | 'outbound';
  subject: string | null;
  summary: string;
  detailed_notes: string | null;
  outcome: 'positive' | 'neutral' | 'negative' | 'follow_up_needed' | 'no_response' | null;
  follow_up_date: string | null;
  follow_up_completed: boolean;
  duration_minutes: number | null;
  attachments: any | null;
  created_at: string;
  updated_at: string;
  contact?: MloContact;
}

export interface MloRelationshipScore {
  id: string;
  user_id: string;
  clinic_key: number | null;
  referrer_key: number | null;
  overall_score: number | null;
  engagement_score: number | null;
  satisfaction_score: number | null;
  referral_trend: 'increasing' | 'stable' | 'decreasing' | 'new' | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | null;
  last_visit_date: string | null;
  days_since_last_contact: number | null;
  total_referrals_ytd: number;
  notes: string | null;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface MloTask {
  id: string;
  user_id: string;
  assigned_to: string | null;
  contact_id: string | null;
  clinic_key: number | null;
  referrer_key: number | null;
  title: string;
  description: string | null;
  task_type: 'follow_up' | 'meeting' | 'call' | 'email' | 'research' | 'presentation' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  reminder_date: string | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  contact?: MloContact;
  assignee?: { id: string; full_name: string; email: string };
}

export interface MloPipeline {
  id: string;
  user_id: string;
  clinic_key: number | null;
  referrer_key: number | null;
  contact_id: string | null;
  opportunity_name: string;
  description: string | null;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  expected_monthly_referrals: number | null;
  expected_revenue: number | null;
  probability: number | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  win_reason: string | null;
  loss_reason: string | null;
  competitor: string | null;
  next_action: string | null;
  next_action_date: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  contact?: MloContact;
}

export interface MloActivity {
  id: string;
  user_id: string;
  activity_type: 'visit' | 'communication' | 'task_completed' | 'pipeline_update' | 'contact_added' | 'relationship_change';
  entity_type: 'visit' | 'communication' | 'task' | 'pipeline' | 'contact' | 'relationship';
  entity_id: string;
  clinic_key: number | null;
  referrer_key: number | null;
  title: string;
  description: string | null;
  metadata: any | null;
  created_at: string;
}

// ===== CONTACTS HOOKS =====

export function useMloContacts(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-contacts', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      const { data, error } = await supabase
        .from('mlo_contacts')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .order('last_contacted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as MloContact[];
    },
    enabled: !!targetUserId,
  });
}

export function useAllMloContacts() {
  return useQuery({
    queryKey: ['mlo-contacts-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mlo_contacts')
        .select('*')
        .eq('is_active', true)
        .order('last_contacted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as MloContact[];
    },
  });
}

export function useCreateMloContact() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<MloContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('mlo_contacts')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-contacts'] });
      toast.success('Contact created successfully');
    },
    onError: (error) => {
      logger.error('Error creating contact', error);
      toast.error('Failed to create contact');
    },
  });
}

export function useUpdateMloContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<MloContact> & { id: string }) => {
      const { data, error } = await supabase
        .from('mlo_contacts')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-contacts'] });
      toast.success('Contact updated successfully');
    },
    onError: (error) => {
      logger.error('Error updating contact', error);
      toast.error('Failed to update contact');
    },
  });
}

export function useDeleteMloContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('mlo_contacts')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-contacts'] });
      toast.success('Contact deleted successfully');
    },
    onError: (error) => {
      logger.error('Error deleting contact', error);
      toast.error('Failed to delete contact');
    },
  });
}

// ===== COMMUNICATIONS HOOKS =====

export function useMloCommunications(userId?: string, contactId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-communications', targetUserId, contactId],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      let query = supabase
        .from('mlo_communications')
        .select(`
          *,
          contact:mlo_contacts(*)
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MloCommunication[];
    },
    enabled: !!targetUserId,
  });
}

export function useAllMloCommunications() {
  return useQuery({
    queryKey: ['mlo-communications-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mlo_communications')
        .select(`
          *,
          contact:mlo_contacts(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MloCommunication[];
    },
  });
}

export function useCreateMloCommunication() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<MloCommunication, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'contact'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('mlo_communications')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Update contact's last_contacted_at
      if (input.contact_id) {
        await supabase
          .from('mlo_contacts')
          .update({ last_contacted_at: new Date().toISOString() })
          .eq('id', input.contact_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-communications'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['mlo-activities'] });
      toast.success('Communication logged successfully');
    },
    onError: (error) => {
      logger.error('Error logging communication', error);
      toast.error('Failed to log communication');
    },
  });
}

// ===== TASKS HOOKS =====

export function useMloTasks(userId?: string, status?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-tasks', targetUserId, status],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      let query = supabase
        .from('mlo_tasks')
        .select(`
          *,
          contact:mlo_contacts(*)
        `)
        .or(`user_id.eq.${targetUserId},assigned_to.eq.${targetUserId}`)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MloTask[];
    },
    enabled: !!targetUserId,
  });
}

export function useAllMloTasks(status?: string) {
  return useQuery({
    queryKey: ['mlo-tasks-all', status],
    queryFn: async () => {
      let query = supabase
        .from('mlo_tasks')
        .select(`
          *,
          contact:mlo_contacts(*)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MloTask[];
    },
  });
}

export function useCreateMloTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<MloTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'contact' | 'assignee'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('mlo_tasks')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      logger.error('Error creating task', error);
      toast.error('Failed to create task');
    },
  });
}

export function useUpdateMloTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<MloTask> & { id: string }) => {
      const updateData: any = { ...input };
      
      // If marking as completed, set completed_at
      if (input.status === 'completed' && !input.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('mlo_tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-tasks'] });
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      logger.error('Error updating task', error);
      toast.error('Failed to update task');
    },
  });
}

export function useDeleteMloTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mlo_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error) => {
      logger.error('Error deleting task', error);
      toast.error('Failed to delete task');
    },
  });
}

// ===== PIPELINE HOOKS =====

export function useMloPipeline(userId?: string, stage?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-pipeline', targetUserId, stage],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      let query = supabase
        .from('mlo_pipeline')
        .select(`
          *,
          contact:mlo_contacts(*)
        `)
        .eq('user_id', targetUserId)
        .order('expected_close_date', { ascending: true, nullsFirst: false });

      if (stage && stage !== 'all') {
        query = query.eq('stage', stage);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MloPipeline[];
    },
    enabled: !!targetUserId,
  });
}

export function useAllMloPipeline(stage?: string) {
  return useQuery({
    queryKey: ['mlo-pipeline-all', stage],
    queryFn: async () => {
      let query = supabase
        .from('mlo_pipeline')
        .select(`
          *,
          contact:mlo_contacts(*)
        `)
        .order('expected_close_date', { ascending: true, nullsFirst: false });

      if (stage && stage !== 'all') {
        query = query.eq('stage', stage);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MloPipeline[];
    },
  });
}

export function useCreateMloPipeline() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<MloPipeline, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'contact'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('mlo_pipeline')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-pipeline'] });
      toast.success('Opportunity created successfully');
    },
    onError: (error) => {
      logger.error('Error creating opportunity', error);
      toast.error('Failed to create opportunity');
    },
  });
}

export function useUpdateMloPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<MloPipeline> & { id: string }) => {
      const updateData: any = { ...input };
      
      // If closing, set actual close date
      if ((input.stage === 'closed_won' || input.stage === 'closed_lost') && !input.actual_close_date) {
        updateData.actual_close_date = new Date().toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('mlo_pipeline')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-pipeline'] });
      toast.success('Opportunity updated successfully');
    },
    onError: (error) => {
      logger.error('Error updating opportunity', error);
      toast.error('Failed to update opportunity');
    },
  });
}

export function useDeleteMloPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mlo_pipeline')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-pipeline'] });
      toast.success('Opportunity deleted successfully');
    },
    onError: (error) => {
      logger.error('Error deleting opportunity', error);
      toast.error('Failed to delete opportunity');
    },
  });
}

// ===== RELATIONSHIP SCORES HOOKS =====

export function useMloRelationshipScores(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-relationship-scores', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      const { data, error } = await supabase
        .from('mlo_relationship_scores')
        .select('*')
        .eq('user_id', targetUserId)
        .order('overall_score', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as MloRelationshipScore[];
    },
    enabled: !!targetUserId,
  });
}

export function useAllMloRelationshipScores() {
  return useQuery({
    queryKey: ['mlo-relationship-scores-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mlo_relationship_scores')
        .select('*')
        .order('overall_score', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as MloRelationshipScore[];
    },
  });
}

export function useUpsertMloRelationshipScore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<MloRelationshipScore, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'calculated_at'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('mlo_relationship_scores')
        .upsert(
          { ...input, user_id: user.id, calculated_at: new Date().toISOString() },
          { onConflict: input.clinic_key ? 'user_id,clinic_key' : 'user_id,referrer_key' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlo-relationship-scores'] });
      toast.success('Relationship score updated');
    },
    onError: (error) => {
      logger.error('Error updating relationship score', error);
      toast.error('Failed to update relationship score');
    },
  });
}

// ===== ACTIVITIES HOOKS =====

export function useMloActivities(userId?: string, limit = 50) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['mlo-activities', targetUserId, limit],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      const { data, error } = await supabase
        .from('mlo_activities')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MloActivity[];
    },
    enabled: !!targetUserId,
  });
}

export function useAllMloActivities(limit = 100) {
  return useQuery({
    queryKey: ['mlo-activities-all', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mlo_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MloActivity[];
    },
  });
}

// ===== CRM STATS =====

export function useMloCrmStats(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const contactsQuery = useMloContacts(targetUserId);
  const tasksQuery = useMloTasks(targetUserId);
  const pipelineQuery = useMloPipeline(targetUserId);
  const scoresQuery = useMloRelationshipScores(targetUserId);

  const stats = {
    totalContacts: contactsQuery.data?.length || 0,
    keyDecisionMakers: contactsQuery.data?.filter(c => c.is_key_decision_maker).length || 0,
    pendingTasks: tasksQuery.data?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0,
    overdueTasks: tasksQuery.data?.filter(t => {
      if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
      return new Date(t.due_date) < new Date();
    }).length || 0,
    activeOpportunities: pipelineQuery.data?.filter(p => !['closed_won', 'closed_lost'].includes(p.stage)).length || 0,
    pipelineValue: pipelineQuery.data
      ?.filter(p => !['closed_won', 'closed_lost'].includes(p.stage))
      .reduce((sum, p) => sum + (p.expected_revenue || 0), 0) || 0,
    atRiskRelationships: scoresQuery.data?.filter(s => s.risk_level === 'high' || s.risk_level === 'critical').length || 0,
    avgRelationshipScore: scoresQuery.data?.length 
      ? Math.round(scoresQuery.data.reduce((sum, s) => sum + (s.overall_score || 0), 0) / scoresQuery.data.length)
      : 0,
  };

  return {
    stats,
    isLoading: contactsQuery.isLoading || tasksQuery.isLoading || pipelineQuery.isLoading || scoresQuery.isLoading,
    error: contactsQuery.error || tasksQuery.error || pipelineQuery.error || scoresQuery.error,
  };
}
