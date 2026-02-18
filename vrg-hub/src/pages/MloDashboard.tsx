import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import {
  Users,
  MapPin,
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  Target,
  List,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  type MloVisit,
  useMloVisits,
  useMloTargets,
  useMloAssignments,
  useMloFollowUps,
  useMloPerformanceStats,
  useCompleteFollowUp,
} from "@/hooks/useMloData";
import { MloVisitForm } from "@/components/mlo/MloVisitForm";
import { ConnectCalendarButton } from "@/components/mlo/ConnectCalendarButton";
import { OutlookEventsCard } from "@/components/mlo/OutlookEventsCard";
import { OutlookCalendarView } from "@/components/mlo/OutlookCalendarView";
import { MetabasePerformanceDashboard } from "@/components/mlo/MetabasePerformanceDashboard";
import { type MloVisitDetails, MloVisitDetailsPanel } from "@/components/mlo/MloVisitDetailsPanel";
import { ViewAsMLOSelector } from "@/components/mlo/ViewAsMLOSelector";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const VISIT_TYPE_LABELS: Record<string, string> = {
  site_visit: 'Site Visit',
  phone_call: 'Phone Call',
  video_call: 'Video Call',
  email: 'Email',
  event: 'Event',
  other: 'Other',
};

const OUTCOME_LABELS: Record<string, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  follow_up_required: 'Follow-up Required',
  issue_raised: 'Issue Raised',
  no_contact: 'No Contact',
};

const OUTCOME_COLORS: Record<string, string> = {
  positive: 'hsl(var(--chart-1))',
  neutral: 'hsl(var(--chart-2))',
  follow_up_required: 'hsl(var(--chart-3))',
  issue_raised: 'hsl(var(--chart-4))',
  no_contact: 'hsl(var(--chart-5))',
};

export default function MloDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [periodTab, setPeriodTab] = useState<'month' | 'quarter'>('month');
  const [selectedVisit, setSelectedVisit] = useState<MloVisitDetails | null>(null);
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  const [viewAsUserName, setViewAsUserName] = useState<string | null>(null);

  // Use the impersonated user ID if set, otherwise use the logged-in user
  const effectiveUserId = viewAsUserId || user?.id;

  const visitToDetails = (visit: MloVisit): MloVisitDetails => ({
    id: visit.id,
    visit_date: visit.visit_date,
    visit_time: visit.visit_time,
    visit_type: visit.visit_type,
    contact_name: visit.contact_name,
    contact_role: visit.contact_role,
    purpose: visit.purpose,
    notes: visit.notes,
    outcome: visit.outcome,
    follow_up_date: visit.follow_up_date,
    follow_up_time: visit.follow_up_time,
    follow_up_notes: visit.follow_up_notes,
    follow_up_completed: visit.follow_up_completed,
    visitor_name: visit.user?.full_name ?? null,
    visitor_id: visit.user?.id ?? visit.user_id,
    location_name: visit.location?.name ?? null,
  });

  const openVisitDetails = (visit: MloVisit) => setSelectedVisit(visitToDetails(visit));

  const now = new Date();
  const periodStart = periodTab === 'month' 
    ? format(startOfMonth(now), 'yyyy-MM-dd')
    : format(startOfQuarter(now), 'yyyy-MM-dd');
  const periodEnd = periodTab === 'month'
    ? format(endOfMonth(now), 'yyyy-MM-dd')
    : format(endOfQuarter(now), 'yyyy-MM-dd');

  const { data: visits } = useMloVisits(effectiveUserId, { start: periodStart, end: periodEnd });
  const { data: targets } = useMloTargets(effectiveUserId, periodStart, periodEnd);
  const { data: assignments } = useMloAssignments(effectiveUserId);
  const { data: followUps } = useMloFollowUps(effectiveUserId);
  const { stats } = useMloPerformanceStats(effectiveUserId, periodStart, periodEnd);
  const completeFollowUp = useCompleteFollowUp();

  const currentTarget = targets?.find(t => 
    t.target_period === (periodTab === 'month' ? 'monthly' : 'quarterly')
  );

  const visitsByTypeData = Object.entries(stats.visitsByType).map(([type, count]) => ({
    name: VISIT_TYPE_LABELS[type] || type,
    value: count,
  }));

  const outcomeData = Object.entries(stats.visitsByOutcome).map(([outcome, count]) => ({
    name: OUTCOME_LABELS[outcome] || outcome,
    value: count,
    color: OUTCOME_COLORS[outcome],
  }));

  // Display name - use impersonated user's name if viewing as someone else
  const displayName = viewAsUserName || profile?.full_name || 'MLO';

  return (
    <PageContainer>
      {/* View As Selector for Admins */}
      <div className="mb-4">
        <ViewAsMLOSelector 
          value={viewAsUserId}
          onChange={(userId, userName) => {
            setViewAsUserId(userId);
            setViewAsUserName(userName);
          }}
        />
      </div>

      <PageHeader 
        title="MLO Dashboard" 
        description={viewAsUserId ? `Viewing as: ${displayName}` : `Welcome back, ${displayName}`}
        actions={
          <div className="flex gap-2">
            <ConnectCalendarButton />
            <Button variant="outline" onClick={() => navigate('/mlo/visits')}>
              <List className="mr-2 h-4 w-4" />
              All Visits
            </Button>
            <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Visit
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log New Visit</DialogTitle>
              </DialogHeader>
              <MloVisitForm 
                onSuccess={() => setIsVisitDialogOpen(false)}
                onCancel={() => setIsVisitDialogOpen(false)}
              />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Period Selector */}
      <Tabs value={periodTab} onValueChange={(v) => setPeriodTab(v as 'month' | 'quarter')} className="mb-6">
        <TabsList>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="quarter">This Quarter</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            {currentTarget && (
              <p className="text-xs text-muted-foreground">
                Target: {currentTarget.target_visits}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.targetProgress}%</div>
            <Progress value={Math.min(stats.targetProgress, 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Worksites</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {assignments?.filter(a => a.is_primary).length || 0} primary
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{followUps?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Visits by Type Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Visits by Type</CardTitle>
            <CardDescription>Distribution of visit types this {periodTab}</CardDescription>
          </CardHeader>
          <CardContent>
            {visitsByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={visitsByTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No visits logged yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outcomes Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Visit Outcomes</CardTitle>
            <CardDescription>Results of your visits</CardDescription>
          </CardHeader>
          <CardContent>
            {outcomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {outcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No outcomes recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metabase Performance Dashboard from BigQuery */}
      <div className="mb-6">
        <MetabasePerformanceDashboard />
      </div>

      {/* Full Outlook Calendar View */}
      <div className="mb-6">
        <OutlookCalendarView />
      </div>

      {/* Follow-ups, Outlook Events, and Recent Visits */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followUps && followUps.length > 0 ? (
              <div className="space-y-3">
                {followUps.slice(0, 5).map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => openVisitDetails(visit)}
                  >
                    <div>
                      <div className="font-medium">{visit.contact_name || 'Unknown Contact'}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(visit.follow_up_date!), 'PPP')}
                      </div>
                      {visit.follow_up_notes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {visit.follow_up_notes}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        completeFollowUp.mutate(visit.id);
                      }}
                      disabled={completeFollowUp.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming follow-ups
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outlook Calendar Events */}
        <OutlookEventsCard />

        {/* Recent Visits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Recent Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visits && visits.length > 0 ? (
              <div className="space-y-3">
                {visits.slice(0, 5).map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => openVisitDetails(visit)}
                  >
                    <div>
                      <div className="font-medium">{visit.contact_name || 'Unknown Contact'}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(visit.visit_date), 'PPP')}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {VISIT_TYPE_LABELS[visit.visit_type]}
                        </Badge>
                        {visit.outcome && (
                          <Badge
                            variant={visit.outcome === 'positive' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {OUTCOME_LABELS[visit.outcome]}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {visit.location && (
                      <div className="text-sm text-muted-foreground">
                        {visit.location.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No visits logged yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assigned Worksites */}
      {assignments && assignments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Your Assigned Worksites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => (
                <div 
                  key={assignment.id} 
                  className={`p-4 border rounded-lg ${assignment.is_primary ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{assignment.location?.name}</span>
                    {assignment.is_primary && (
                      <Badge variant="default" className="text-xs">Primary</Badge>
                    )}
                  </div>
                  {assignment.location?.brand && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {assignment.location.brand.display_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <MloVisitDetailsPanel
        visit={selectedVisit}
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
      />
    </PageContainer>
  );
}
