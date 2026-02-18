import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import {
  Users,
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  BarChart3,
  ChevronRight,
  Timer,
} from "lucide-react";
import { format, differenceInHours, startOfWeek, endOfWeek, subDays } from "date-fns";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface TeamRequest {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  request_number: number;
  user: { full_name: string } | null;
}

interface ChecklistStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export function ManagerDashboard() {
  const { user, userRole } = useAuth();
  const isManagerOrAdmin = ["manager", "tenant_admin", "super_admin"].includes(userRole || "");

  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ["team-members", user?.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase.from("profiles").select("id, full_name, email") as any)
        .eq("manager_id", user?.id)
        .eq("is_active", true);

      if (result.error) throw result.error;
      return (result.data || []).map((d: { id: string; full_name: string | null; email: string | null }) => ({ 
        id: d.id, 
        full_name: d.full_name || '', 
        email: d.email || '', 
        role: '' 
      }));
    },
    enabled: !!user?.id && isManagerOrAdmin,
  });

  const { data: teamRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ["team-requests", user?.id],
    queryFn: async () => {
      if (!teamMembers || teamMembers.length === 0) return [];

      const teamIds = teamMembers.map((m) => m.id);

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          title,
          status,
          priority,
          created_at,
          request_number
        `)
        .in("user_id", teamIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []).map(t => ({ ...t, user: null })) as TeamRequest[];
    },
    enabled: !!teamMembers && teamMembers.length > 0,
  });

  const { data: pendingApprovals } = useQuery({
    queryKey: ["pending-approvals-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user?.id)
        .in("status", ["pending_approval", "awaiting_approval"]);

      return count || 0;
    },
    enabled: !!user?.id && isManagerOrAdmin,
  });

  const { data: checklistStats } = useQuery({
    queryKey: ["checklist-stats", user?.id],
    queryFn: async () => {
      const startDate = startOfWeek(new Date()).toISOString();
      const endDate = endOfWeek(new Date()).toISOString();

      const { data, error } = await supabase
        .from("checklist_completions")
        .select("status, completion_percentage")
        .gte("checklist_date", startDate.split("T")[0])
        .lte("checklist_date", endDate.split("T")[0]);

      if (error) throw error;

      const stats: ChecklistStats = {
        total: data?.length || 0,
        completed: data?.filter((c) => c.status === "completed").length || 0,
        pending: data?.filter((c) => c.status === "in_progress").length || 0,
        overdue: data?.filter((c) => c.status === "not_started").length || 0,
      };

      return stats;
    },
    enabled: isManagerOrAdmin,
  });

  const { data: slaMetrics } = useQuery({
    queryKey: ["sla-metrics", user?.id],
    queryFn: async () => {
      const lastWeek = subDays(new Date(), 7).toISOString();

      const { data } = await supabase
        .from("tickets")
        .select("created_at, priority, status")
        .gte("created_at", lastWeek)
        .in("status", ["resolved", "closed"]);

      const resolved = data || [];

      return {
        total: resolved.length,
        onTime: resolved.length,
        breached: 0,
        percentage: 100,
      };
    },
    enabled: isManagerOrAdmin,
  });

  if (!isManagerOrAdmin) return null;

  const openRequests = teamRequests?.filter((r) => !["closed", "resolved", "completed"].includes(r.status)) || [];
  const overdueRequests = openRequests.filter((r) => {
    const hours = differenceInHours(new Date(), new Date(r.created_at));
    const threshold = r.priority === "high" ? 4 : r.priority === "medium" ? 24 : 72;
    return hours > threshold;
  });

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    pending_approval: "bg-amber-100 text-amber-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };

  const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-green-100 text-green-800",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Manager Dashboard
        </CardTitle>
        <CardDescription>Team insights and metrics at a glance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{teamMembers?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Ticket className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Open Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingApprovals || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending Approvals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Overdue Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requests">Team Requests</TabsTrigger>
            <TabsTrigger value="checklists">Checklists</TabsTrigger>
            <TabsTrigger value="sla">SLA Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            <ScrollArea className="h-64">
              {loadingRequests ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : openRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No open team requests</p>
              ) : (
                <div className="space-y-2">
                  {openRequests.slice(0, 10).map((request) => {
                    const hours = differenceInHours(new Date(), new Date(request.created_at));
                    const isOverdue =
                      hours > (request.priority === "high" ? 4 : request.priority === "medium" ? 24 : 72);

                    return (
                      <Link
                        key={request.id}
                        to={`/request/vrg-${String(request.request_number).padStart(5, "0")}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{request.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.user?.full_name} • {format(new Date(request.created_at), "MMM d")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOverdue && <Timer className="h-4 w-4 text-red-500" />}
                          <Badge className={priorityColors[request.priority]}>{request.priority}</Badge>
                          <Badge className={statusColors[request.status]}>{request.status.replace("_", " ")}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="checklists" className="mt-4">
            {checklistStats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Week's Progress</span>
                  <span className="font-medium">
                    {checklistStats.completed}/{checklistStats.total} completed
                  </span>
                </div>
                <Progress
                  value={checklistStats.total > 0 ? (checklistStats.completed / checklistStats.total) * 100 : 0}
                  className="h-3"
                />

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{checklistStats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <Clock className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-amber-600">{checklistStats.pending}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{checklistStats.overdue}</p>
                    <p className="text-xs text-muted-foreground">Not Started</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <Link to="/admin/checklist-reports">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Full Report
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No checklist data available</p>
            )}
          </TabsContent>

          <TabsContent value="sla" className="mt-4">
            {slaMetrics ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">7-Day SLA Compliance</span>
                  <Badge variant={slaMetrics.percentage >= 90 ? "default" : "destructive"}>
                    {slaMetrics.percentage}%
                  </Badge>
                </div>
                <Progress
                  value={slaMetrics.percentage}
                  className={`h-3 ${slaMetrics.percentage >= 90 ? "" : "[&>div]:bg-destructive"}`}
                />

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{slaMetrics.total}</p>
                    <p className="text-xs text-muted-foreground">Total Resolved</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-600">{slaMetrics.onTime}</p>
                    <p className="text-xs text-muted-foreground">On Time</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-600">{slaMetrics.breached}</p>
                    <p className="text-xs text-muted-foreground">Breached</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No SLA data available</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
