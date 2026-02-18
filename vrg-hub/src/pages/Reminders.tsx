import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Bell, Calendar, Clock, Mail, Smartphone, Upload, FileSpreadsheet, X, Search, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { toast } from "sonner";
import { SmsLogsViewer } from "@/components/reminders/SmsLogsViewer";
import { ReminderDashboard, ReminderFilter } from "@/components/reminders/ReminderDashboard";
import { ReminderCalendar } from "@/components/reminders/ReminderCalendar";
import { TabsContent } from "@/components/ui/tabs";
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs";
import { ReminderBulkImport } from "@/components/reminders/ReminderBulkImport";
import { ReminderReportExport } from "@/components/reminders/ReminderReportExport";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";


export default function Reminders() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<ReminderFilter>({ status: 'active' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showReportExport, setShowReportExport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch in-app notifications - kept for potential future use
  void useQuery({
    queryKey: ['in-app-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_notifications')
        .select(`
          *,
          reminders(title, description, reminder_date)
        `)
        .eq('notification_type', 'in_app')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders', activeFilter],
    queryFn: async () => {
      let query = supabase
        .from('reminders')
        .select('*')
        .order('reminder_date', { ascending: true });

      // Apply status filter
      if (activeFilter.status && activeFilter.status !== 'all') {
        query = query.eq('status', activeFilter.status);
      }

      // Apply category filter
      if (activeFilter.category) {
        query = query.eq('reminder_type', activeFilter.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply timeframe filter client-side
      if (activeFilter.timeframe && data) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const oneWeek = new Date(now);
        oneWeek.setDate(oneWeek.getDate() + 7);
        const oneMonth = new Date(now);
        oneMonth.setMonth(oneMonth.getMonth() + 1);

        return data.filter(r => {
          const date = new Date(r.reminder_date);
          date.setHours(0, 0, 0, 0);

          switch (activeFilter.timeframe) {
            case 'expired':
              return date < now;
            case 'week':
              return date >= now && date <= oneWeek;
            case 'month':
              return date > oneWeek && date <= oneMonth;
            default:
              return true;
          }
        });
      }

      return data;
    },
  });

  const { data: upcomingReminders } = useQuery({
    queryKey: ['upcoming-reminders', 'next-7-days', 5],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'active')
        .gte('reminder_date', today.toISOString())
        .lte('reminder_date', nextWeek.toISOString())
        .order('reminder_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const getDaysUntil = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0);
    const diffTime = reminderDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };


  const handleTestReminder = async () => {
    try {
      const { error } = await supabase.functions.invoke('check-reminders');
      if (error) throw error;
      toast.success('Reminder check triggered successfully');
    } catch (error: any) {
      toast.error('Failed to trigger reminder check: ' + error.message);
    }
  };

  const handleFilterClick = (filter: ReminderFilter) => {
    setActiveFilter(filter);
    setActiveTab('list');
  };

  const clearFilters = () => {
    setActiveFilter({ status: 'active' });
  };

  const getFilterDescription = () => {
    const parts: string[] = [];
    
    if (activeFilter.status && activeFilter.status !== 'all') {
      parts.push(activeFilter.status.charAt(0).toUpperCase() + activeFilter.status.slice(1));
    }
    
    if (activeFilter.category) {
      const categoryLabels: Record<string, string> = {
        license_expiration: 'License Expiration',
        event: 'Events',
        certification: 'Certifications',
        contract: 'Contracts',
        subscription: 'Subscriptions',
        general: 'General',
      };
      parts.push(categoryLabels[activeFilter.category] || activeFilter.category);
    }
    
    if (activeFilter.timeframe) {
      const timeframeLabels: Record<string, string> = {
        expired: 'Expired/Past Due',
        week: 'Due in 1 Week',
        month: 'Due in 1 Month',
      };
      parts.push(timeframeLabels[activeFilter.timeframe] || activeFilter.timeframe);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'All Reminders';
  };

  const hasActiveFilters = activeFilter.category || activeFilter.timeframe || (activeFilter.status && activeFilter.status !== 'active');

  // Filter reminders based on search query
  const filteredReminders = reminders?.filter(reminder =>
    reminder.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reminder.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <ReminderBulkImport onClose={() => setShowBulkImport(false)} />
        </DialogContent>
      </Dialog>

      {/* Report Export Dialog */}
      <Dialog open={showReportExport} onOpenChange={setShowReportExport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <ReminderReportExport onClose={() => setShowReportExport(false)} />
        </DialogContent>
      </Dialog>

      {/* Header */}
      <PageHeader
        title="Reminders"
        description="Manage your reminders for licenses, events, and more"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowBulkImport(true)} variant="outline" size="sm" className="sm:size-default">
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Bulk Import</span>
            </Button>
            <Button onClick={() => setShowReportExport(true)} variant="outline" size="sm" className="sm:size-default">
              <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Reports</span>
            </Button>
            <Button onClick={handleTestReminder} variant="outline" size="sm" className="hidden md:flex">
              Test Reminder Check
            </Button>
            <Button onClick={() => navigate('/reminders/new')} size="sm" className="sm:size-default">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Reminder</span>
            </Button>
          </div>
        }
      />

      {/* Tabs for Dashboard and List View */}
      <UnderlineTabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <UnderlineTabsList>
          <UnderlineTabsTrigger value="dashboard">Dashboard</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="calendar">Calendar</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="list">List</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="logs">Logs</UnderlineTabsTrigger>
        </UnderlineTabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <ReminderDashboard onFilterClick={handleFilterClick} />
        </TabsContent>

        <TabsContent value="calendar">
          <ReminderCalendar />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          {/* Search and Filter Toolbar */}
          <Card className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reminders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-start">
                  <Button
                    variant={!activeFilter.status || activeFilter.status === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs sm:text-sm px-2.5 sm:px-3"
                    onClick={() => setActiveFilter({ ...activeFilter, status: 'all' })}
                  >
                    All
                  </Button>
                  <Button
                    variant={activeFilter.status === 'active' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs sm:text-sm px-2.5 sm:px-3"
                    onClick={() => setActiveFilter({ ...activeFilter, status: 'active' })}
                  >
                    Active
                  </Button>
                  <Button
                    variant={activeFilter.status === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs sm:text-sm px-2.5 sm:px-3"
                    onClick={() => setActiveFilter({ ...activeFilter, status: 'completed' })}
                  >
                    Done
                  </Button>
                  <Button
                    variant={activeFilter.status === 'archived' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs sm:text-sm px-2.5 sm:px-3"
                    onClick={() => setActiveFilter({ ...activeFilter, status: 'archived' })}
                  >
                    Archived
                  </Button>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" className="px-2" onClick={clearFilters}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="transition-all duration-200 hover:shadow-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Upcoming</CardTitle>
                <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-info/10">
                  <Calendar className="h-5 w-5 text-info" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{upcomingReminders?.length || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">7 days</p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-200 hover:shadow-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Showing</CardTitle>
                <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{filteredReminders?.length || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">filtered</p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-200 hover:shadow-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">This Month</CardTitle>
                <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-success/10">
                  <Clock className="h-5 w-5 text-success" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">
                  {reminders?.filter(r => {
                    const date = new Date(r.reminder_date);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length || 0}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">total</p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Reminders */}
          {!hasActiveFilters && !searchQuery && upcomingReminders && upcomingReminders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming This Week</CardTitle>
                <CardDescription>Reminders in the next 7 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingReminders.map((reminder) => {
                  const daysUntil = getDaysUntil(reminder.reminder_date);
                  const channels = reminder.notification_channels as { email?: boolean; sms?: boolean; in_app?: boolean };

                  return (
                    <Card
                      key={reminder.id}
                      className="group transition-all duration-200 hover:shadow-md hover:scale-[1.01] cursor-pointer border-l-4 border-l-primary"
                      onClick={() => navigate(`/reminders/${reminder.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
                            <Calendar className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold mb-1">{reminder.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{reminder.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={daysUntil === 0 ? 'destructive' : daysUntil <= 3 ? 'default' : 'secondary'}>
                                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatAUDateTimeFull(reminder.reminder_date)}
                              </span>
                              <div className="flex items-center gap-1 ml-auto">
                                {channels.email && <Mail className="h-3 w-3 text-muted-foreground" />}
                                {channels.sms && <Smartphone className="h-3 w-3 text-muted-foreground" />}
                                {channels.in_app && <Bell className="h-3 w-3 text-muted-foreground" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* All Reminders List */}
          <Card>
            <CardHeader>
              <CardTitle>{getFilterDescription()}</CardTitle>
              <CardDescription>{filteredReminders?.length || 0} reminder(s) found</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="border-l-4 border-l-muted">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-4 w-48" />
                              <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                            <Skeleton className="h-3 w-full max-w-md" />
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-3 w-32" />
                              <Skeleton className="h-5 w-14 rounded-full" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !filteredReminders || filteredReminders.length === 0 ? (
                <EmptyState
                  icon={<Bell />}
                  title="No reminders found"
                  description={searchQuery ? "No reminders match your search criteria" : "No reminders found matching your filters"}
                  action={
                    hasActiveFilters || searchQuery
                      ? {
                          label: "Clear Filters",
                          onClick: () => {
                            clearFilters();
                            setSearchQuery('');
                          },
                        }
                      : {
                          label: "Create Reminder",
                          onClick: () => navigate('/reminders/new'),
                          icon: <Plus className="h-4 w-4" />,
                        }
                  }
                />
              ) : (
                <div className="space-y-3">
                  {filteredReminders.map((reminder) => {
                    const daysUntil = getDaysUntil(reminder.reminder_date);
                    const channels = reminder.notification_channels as { email?: boolean; sms?: boolean; in_app?: boolean };

                    return (
                      <Card
                        key={reminder.id}
                        className="group transition-all duration-200 hover:shadow-elevated active:scale-[0.99] cursor-pointer border-l-4"
                        style={{ borderLeftColor: `hsl(var(--${reminder.status === 'completed' ? 'success' : reminder.status === 'archived' ? 'muted-foreground' : daysUntil < 0 ? 'destructive' : 'primary'}))` }}
                        onClick={() => navigate(`/reminders/${reminder.id}`)}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start gap-3 sm:gap-4">
                            {/* Icon with colored background - smaller on mobile */}
                            <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0 ${
                              reminder.status === 'completed' ? 'bg-success/10' :
                              reminder.status === 'archived' ? 'bg-muted/30' :
                              daysUntil < 0 ? 'bg-destructive/10' : 'bg-primary/10'
                            }`}>
                              <Bell className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                reminder.status === 'completed' ? 'text-success' :
                                reminder.status === 'archived' ? 'text-muted-foreground' :
                                daysUntil < 0 ? 'text-destructive' : 'text-primary'
                              }`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                                <h3 className="font-semibold text-sm sm:text-base leading-tight">{reminder.title}</h3>
                                <div className="flex gap-1 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0">
                                    {reminder.reminder_type.replace('_', ' ')}
                                  </Badge>
                                  {reminder.is_recurring && (
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                                      Recurring
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {reminder.description && (
                                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2 mb-2">
                                  {reminder.description}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm text-muted-foreground">
                                  📅 {formatAUDateTimeFull(reminder.reminder_date)}
                                </span>
                                {reminder.status === 'active' && (
                                  <Badge 
                                    variant={daysUntil < 0 ? 'destructive' : daysUntil === 0 ? 'destructive' : daysUntil <= 3 ? 'default' : 'secondary'}
                                    className="text-[10px] sm:text-xs px-1.5 py-0"
                                  >
                                    {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                                  </Badge>
                                )}
                                {reminder.status === 'completed' && (
                                  <Badge variant="success" className="text-[10px] sm:text-xs px-1.5 py-0">Done</Badge>
                                )}
                                {reminder.status === 'archived' && (
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">Archived</Badge>
                                )}
                                {/* Channel icons - always visible */}
                                <div className="flex items-center gap-1 ml-auto">
                                  {channels.email && <Mail className="h-3 w-3 text-muted-foreground" />}
                                  {channels.sms && <Smartphone className="h-3 w-3 text-muted-foreground" />}
                                  {channels.in_app && <Bell className="h-3 w-3 text-muted-foreground" />}
                                </div>
                              </div>
                            </div>

                            {/* Edit Button - visible on hover for desktop */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/reminders/edit/${reminder.id}`);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <SmsLogsViewer />
        </TabsContent>
      </UnderlineTabs>
    </PageContainer>
  );
}
