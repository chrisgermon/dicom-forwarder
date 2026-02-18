import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TicketIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  openTickets: number;
  myOpenTickets: number;
  pendingApprovals: number;
  completedThisWeek: number;
  avgResolutionDays: number | null;
  myAssignedTickets: number;
}

export function RoleDashboardWidget() {
  const { user, userRole } = useAuth();
  
  const isAdmin = ['super_admin', 'tenant_admin'].includes(userRole || '');
  const isManager = ['manager', 'marketing_manager'].includes(userRole || '');
  const showAdminStats = isAdmin || isManager;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id, userRole],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get open tickets count (for admins/managers)
      const { count: openTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      
      // Get my open tickets
      const { count: myOpenTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('status', 'open');
      
      // Get pending approvals (hardware requests awaiting approval)
      const { count: pendingApprovals } = await supabase
        .from('hardware_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');
      
      // Get completed this week
      const { count: completedThisWeek } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', weekAgo.toISOString());
      
      // Get tickets assigned to me
      const { count: myAssignedTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user?.id)
        .neq('status', 'completed');
      
      // Calculate average resolution time (simplified)
      let avgResolutionDays: number | null = null;
      if (showAdminStats) {
        const { data: completedTickets } = await supabase
          .from('tickets')
          .select('created_at, updated_at')
          .eq('status', 'completed')
          .gte('updated_at', weekAgo.toISOString())
          .limit(100);
        
        if (completedTickets && completedTickets.length > 0) {
          const totalDays = completedTickets.reduce((sum, ticket) => {
            const created = new Date(ticket.created_at).getTime();
            const completed = new Date(ticket.updated_at).getTime();
            return sum + (completed - created) / (1000 * 60 * 60 * 24);
          }, 0);
          avgResolutionDays = Math.round((totalDays / completedTickets.length) * 10) / 10;
        }
      }
      
      return {
        openTickets: openTickets || 0,
        myOpenTickets: myOpenTickets || 0,
        pendingApprovals: pendingApprovals || 0,
        completedThisWeek: completedThisWeek || 0,
        avgResolutionDays,
        myAssignedTickets: myAssignedTickets || 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Your Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    // Always show personal stats
    {
      label: 'My Open Requests',
      value: stats?.myOpenTickets || 0,
      icon: TicketIcon,
      color: 'text-blue-500',
      href: '/requests?filter=my-requests',
      show: true,
    },
    {
      label: 'Assigned to Me',
      value: stats?.myAssignedTickets || 0,
      icon: Users,
      color: 'text-purple-500',
      href: '/requests',
      show: stats?.myAssignedTickets && stats.myAssignedTickets > 0,
    },
    // Admin/Manager stats
    {
      label: 'All Open Tickets',
      value: stats?.openTickets || 0,
      icon: AlertCircle,
      color: 'text-yellow-500',
      href: '/requests',
      show: showAdminStats,
    },
    {
      label: 'Pending Approvals',
      value: stats?.pendingApprovals || 0,
      icon: Clock,
      color: 'text-amber-500',
      href: '/approvals',
      show: showAdminStats && stats?.pendingApprovals && stats.pendingApprovals > 0,
    },
    {
      label: 'Completed This Week',
      value: stats?.completedThisWeek || 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      href: '/requests',
      show: showAdminStats,
    },
    {
      label: 'Avg Resolution (days)',
      value: stats?.avgResolutionDays ?? '-',
      icon: TrendingUp,
      color: 'text-teal-500',
      href: '/analytics-ai',
      show: showAdminStats && stats?.avgResolutionDays !== null,
    },
  ].filter(item => item.show);

  if (statItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Your Dashboard</CardTitle>
          {isAdmin && (
            <Badge variant="outline" className="text-xs">
              Admin View
            </Badge>
          )}
          {isManager && !isAdmin && (
            <Badge variant="outline" className="text-xs">
              Manager View
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        {statItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-md bg-background ${item.color}`}>
                <item.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {item.label}
              </span>
            </div>
            <span className="text-lg font-semibold tabular-nums">
              {item.value}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
