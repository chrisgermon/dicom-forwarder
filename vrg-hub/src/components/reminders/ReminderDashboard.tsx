import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle2, Bell } from "lucide-react";

export interface ReminderFilter {
  status?: 'all' | 'active' | 'completed' | 'archived';
  category?: string;
  timeframe?: 'expired' | 'week' | 'month' | 'all';
}

interface ReminderDashboardProps {
  onFilterClick: (filter: ReminderFilter) => void;
}

export function ReminderDashboard({ onFilterClick }: ReminderDashboardProps) {
  const { data: stats } = useQuery({
    queryKey: ['reminder-stats'],
    queryFn: async () => {
      const { data: reminders, error } = await supabase
        .from('reminders')
        .select('*');

      if (error) throw error;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const oneWeek = new Date(now);
      oneWeek.setDate(oneWeek.getDate() + 7);

      const oneMonth = new Date(now);
      oneMonth.setMonth(oneMonth.getMonth() + 1);

      const expired = reminders?.filter(r => {
        const date = new Date(r.reminder_date);
        date.setHours(0, 0, 0, 0);
        return date < now && r.status === 'active';
      }).length || 0;

      const completed = reminders?.filter(r => r.status === 'completed').length || 0;
      
      const upcoming = reminders?.filter(r => {
        const date = new Date(r.reminder_date);
        date.setHours(0, 0, 0, 0);
        return date >= now && r.status === 'active';
      }).length || 0;

      const inOneWeek = reminders?.filter(r => {
        const date = new Date(r.reminder_date);
        date.setHours(0, 0, 0, 0);
        return date >= now && date <= oneWeek && r.status === 'active';
      }).length || 0;

      const inOneMonth = reminders?.filter(r => {
        const date = new Date(r.reminder_date);
        date.setHours(0, 0, 0, 0);
        return date > oneWeek && date <= oneMonth && r.status === 'active';
      }).length || 0;

      const total = reminders?.filter(r => r.is_active).length || 0;
      const inactive = reminders?.filter(r => !r.is_active).length || 0;
      const archived = reminders?.filter(r => r.status === 'archived').length || 0;
      const pendingAction = expired;

      const compliance = total > 0 ? Math.round(((total - expired) / total) * 100) : 100;

      // Category breakdown
      const byCategory = reminders?.reduce((acc, r) => {
        const type = r.reminder_type || 'general';
        if (!acc[type]) {
          acc[type] = { expired: 0, pastDue: 0, inWeek: 0, inMonth: 0, total: 0 };
        }
        
        const date = new Date(r.reminder_date);
        date.setHours(0, 0, 0, 0);
        
        acc[type].total++;
        
        if (date < now && r.status === 'active') {
          acc[type].expired++;
          acc[type].pastDue++;
        } else if (date >= now && date <= oneWeek && r.status === 'active') {
          acc[type].inWeek++;
        } else if (date > oneWeek && date <= oneMonth && r.status === 'active') {
          acc[type].inMonth++;
        }
        
        return acc;
      }, {} as Record<string, { expired: number; pastDue: number; inWeek: number; inMonth: number; total: number }>);

      return {
        expired,
        completed,
        upcoming,
        compliance,
        pendingAction,
        inProcess: 0,
        inOneWeek,
        inOneMonth,
        total,
        archived,
        inactive,
        byCategory: byCategory || {},
      };
    },
    refetchInterval: 30000,
  });

  const categoryIcons: Record<string, any> = {
    license_expiration: AlertTriangle,
    event: Calendar,
    certification: CheckCircle2,
    contract: Clock,
    subscription: Bell,
    general: Bell,
  };

  const categoryLabels: Record<string, string> = {
    license_expiration: 'License Expiration',
    event: 'Events',
    certification: 'Certifications',
    contract: 'Contracts',
    subscription: 'Subscriptions',
    general: 'General',
  };

  const ClickableCell = ({ 
    value, 
    variant = 'default',
    onClick 
  }: { 
    value: number; 
    variant?: 'destructive' | 'default' | 'secondary' | 'muted';
    onClick: () => void;
  }) => {
    if (value === 0) {
      return <span className="text-muted-foreground">0</span>;
    }
    
    const variantMap = {
      destructive: 'destructive',
      default: 'default',
      secondary: 'secondary',
      muted: 'outline',
    } as const;

    return (
      <Badge 
        variant={variantMap[variant]} 
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {value}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Grid - 2 cols on mobile, 3 on sm, 6 on lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <Card 
          className="border-l-4 border-l-destructive cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
          onClick={() => onFilterClick({ status: 'active', timeframe: 'expired' })}
        >
          <CardHeader className="p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-destructive">{stats?.expired || 0}</div>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-warning cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
          onClick={() => onFilterClick({ status: 'active', timeframe: 'week' })}
        >
          <CardHeader className="p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Due 1 Week</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats?.inOneWeek || 0}</div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
          onClick={() => onFilterClick({ status: 'active', timeframe: 'month' })}
        >
          <CardHeader className="p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Due 1 Month</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats?.inOneMonth || 0}</div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
          onClick={() => onFilterClick({ status: 'active' })}
        >
          <CardHeader className="p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats?.upcoming || 0}</div>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-primary cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
          onClick={() => onFilterClick({ status: 'completed' })}
        >
          <CardHeader className="p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats?.completed || 0}</div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
          onClick={() => onFilterClick({ status: 'all' })}
        >
          <CardHeader className="p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown - Card layout on mobile, table on desktop */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Category Breakdown</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">Tap any item to view filtered reminders</p>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {/* Mobile: Card-based layout */}
          <div className="sm:hidden space-y-3">
            {Object.entries(stats?.byCategory || {}).map(([type, counts]) => {
              const Icon = categoryIcons[type] || Bell;
              return (
                <div 
                  key={type} 
                  className="p-3 rounded-lg border bg-card cursor-pointer active:scale-[0.98] transition-all"
                  onClick={() => onFilterClick({ category: type })}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{categoryLabels[type] || type}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{counts.total}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div 
                      className="cursor-pointer" 
                      onClick={(e) => { e.stopPropagation(); onFilterClick({ category: type, timeframe: 'expired' }); }}
                    >
                      <div className="text-xs text-muted-foreground mb-1">Expired</div>
                      <Badge variant={counts.expired > 0 ? "destructive" : "outline"} className="text-xs w-full justify-center">
                        {counts.expired}
                      </Badge>
                    </div>
                    <div 
                      className="cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); onFilterClick({ category: type, timeframe: 'expired' }); }}
                    >
                      <div className="text-xs text-muted-foreground mb-1">Past Due</div>
                      <Badge variant={counts.pastDue > 0 ? "destructive" : "outline"} className="text-xs w-full justify-center">
                        {counts.pastDue}
                      </Badge>
                    </div>
                    <div 
                      className="cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); onFilterClick({ category: type, timeframe: 'week' }); }}
                    >
                      <div className="text-xs text-muted-foreground mb-1">1 Week</div>
                      <Badge variant={counts.inWeek > 0 ? "default" : "outline"} className="text-xs w-full justify-center">
                        {counts.inWeek}
                      </Badge>
                    </div>
                    <div 
                      className="cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); onFilterClick({ category: type, timeframe: 'month' }); }}
                    >
                      <div className="text-xs text-muted-foreground mb-1">1 Month</div>
                      <Badge variant={counts.inMonth > 0 ? "secondary" : "outline"} className="text-xs w-full justify-center">
                        {counts.inMonth}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Category</th>
                  <th className="text-center py-3 px-4 font-medium">Expired</th>
                  <th className="text-center py-3 px-4 font-medium">Past Due</th>
                  <th className="text-center py-3 px-4 font-medium">In 1 Week</th>
                  <th className="text-center py-3 px-4 font-medium">In 1 Month</th>
                  <th className="text-center py-3 px-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats?.byCategory || {}).map(([type, counts]) => {
                  const Icon = categoryIcons[type] || Bell;
                  return (
                    <tr key={type} className="border-b hover:bg-accent/50">
                      <td 
                        className="py-3 px-4 cursor-pointer"
                        onClick={() => onFilterClick({ category: type })}
                      >
                        <div className="flex items-center gap-2 hover:text-primary transition-colors">
                          <Icon className="h-4 w-4" />
                          <span className="underline-offset-2 hover:underline">{categoryLabels[type] || type}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <ClickableCell 
                          value={counts.expired} 
                          variant="destructive"
                          onClick={() => onFilterClick({ category: type, timeframe: 'expired' })}
                        />
                      </td>
                      <td className="text-center py-3 px-4">
                        <ClickableCell 
                          value={counts.pastDue} 
                          variant="destructive"
                          onClick={() => onFilterClick({ category: type, timeframe: 'expired' })}
                        />
                      </td>
                      <td className="text-center py-3 px-4">
                        <ClickableCell 
                          value={counts.inWeek} 
                          variant="default"
                          onClick={() => onFilterClick({ category: type, timeframe: 'week' })}
                        />
                      </td>
                      <td className="text-center py-3 px-4">
                        <ClickableCell 
                          value={counts.inMonth} 
                          variant="secondary"
                          onClick={() => onFilterClick({ category: type, timeframe: 'month' })}
                        />
                      </td>
                      <td 
                        className="text-center py-3 px-4 font-medium cursor-pointer hover:text-primary transition-colors"
                        onClick={() => onFilterClick({ category: type })}
                      >
                        <span className="underline-offset-2 hover:underline">{counts.total}</span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 font-semibold">
                  <td className="py-3 px-4">Total</td>
                  <td 
                    className="text-center py-3 px-4 cursor-pointer hover:text-primary"
                    onClick={() => onFilterClick({ timeframe: 'expired' })}
                  >
                    <span className="underline-offset-2 hover:underline">{stats?.expired || 0}</span>
                  </td>
                  <td 
                    className="text-center py-3 px-4 cursor-pointer hover:text-primary"
                    onClick={() => onFilterClick({ timeframe: 'expired' })}
                  >
                    <span className="underline-offset-2 hover:underline">{stats?.expired || 0}</span>
                  </td>
                  <td 
                    className="text-center py-3 px-4 cursor-pointer hover:text-primary"
                    onClick={() => onFilterClick({ timeframe: 'week' })}
                  >
                    <span className="underline-offset-2 hover:underline">{stats?.inOneWeek || 0}</span>
                  </td>
                  <td 
                    className="text-center py-3 px-4 cursor-pointer hover:text-primary"
                    onClick={() => onFilterClick({ timeframe: 'month' })}
                  >
                    <span className="underline-offset-2 hover:underline">{stats?.inOneMonth || 0}</span>
                  </td>
                  <td 
                    className="text-center py-3 px-4 cursor-pointer hover:text-primary"
                    onClick={() => onFilterClick({ status: 'all' })}
                  >
                    <span className="underline-offset-2 hover:underline">{stats?.total || 0}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
