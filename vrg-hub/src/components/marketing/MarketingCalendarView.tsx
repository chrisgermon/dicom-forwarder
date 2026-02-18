import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Mail, FileText, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface NotifyreCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string;
  contact_group_name?: string;
  total_recipients: number;
  delivered_count: number;
  failed_count: number;
  pending_count: number;
  sent_at: string;
  type: 'fax';
}

interface MailchimpCampaign {
  id: string;
  web_id: number;
  settings: {
    title: string;
    subject_line: string;
  };
  status: string;
  emails_sent: number;
  send_time?: string;
  report_summary?: {
    opens?: number;
    unique_opens?: number;
    clicks?: number;
    subscriber_clicks?: number;
  };
  type: 'email';
}

type Campaign = NotifyreCampaign | MailchimpCampaign;

export function MarketingCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCampaigns, setSelectedCampaigns] = useState<Campaign[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notifyreCampaigns = [], isLoading: loadingNotifyre } = useQuery({
    queryKey: ['notifyre-campaigns-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifyre_fax_campaigns')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(campaign => ({ ...campaign, type: 'fax' as const }));
    },
  });

  const { data: mailchimpCampaigns = [], isLoading: loadingMailchimp } = useQuery({
    queryKey: ['mailchimp-campaigns-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-mailchimp-campaigns');
      if (error) throw error;
      return ((data?.campaigns || []) as any[]).map(campaign => ({ ...campaign, type: 'email' as const }));
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifyre-campaigns-calendar'] }),
        queryClient.invalidateQueries({ queryKey: ['mailchimp-campaigns-calendar'] })
      ]);
      toast({
        title: 'Refreshed',
        description: 'Campaign data has been refreshed successfully',
      });
    } catch (error) {
      console.error('Error refreshing campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh campaign data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const allCampaigns: Campaign[] = [...notifyreCampaigns, ...mailchimpCampaigns];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getCampaignsForDate = (date: Date): Campaign[] => {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const targetKey = formatter.format(date);

    return allCampaigns.filter((campaign) => {
      let campaignDateStr: string | undefined;

      if (campaign.type === 'fax') {
        campaignDateStr = (campaign as NotifyreCampaign).sent_at;
      } else if (campaign.type === 'email' && (campaign as MailchimpCampaign).send_time) {
        campaignDateStr = (campaign as MailchimpCampaign).send_time;
      }

      if (!campaignDateStr) return false;

      const campaignDate = parseISO(campaignDateStr);
      const campaignKey = formatter.format(campaignDate);

      return campaignKey === targetKey;
    });
  };

  const handleDateClick = (date: Date, campaigns: Campaign[]) => {
    if (campaigns.length > 0) {
      setSelectedDate(date);
      setSelectedCampaigns(campaigns);
    }
  };

  const isLoading = loadingNotifyre || loadingMailchimp;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {/* Weekday headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] border rounded-lg bg-muted/20" />
              ))}

              {/* Calendar days */}
              {daysInMonth.map(date => {
                const campaigns = getCampaignsForDate(date);
                const hasCampaigns = campaigns.length > 0;
                const isToday = isSameDay(date, new Date());

                return (
                  <div
                    key={date.toString()}
                    className={`min-h-[100px] border rounded-lg p-2 ${
                      !isSameMonth(date, currentDate) ? 'bg-muted/20' : 'bg-background'
                    } ${hasCampaigns ? 'cursor-pointer hover:border-primary' : ''} ${
                      isToday ? 'border-primary border-2' : ''
                    }`}
                    onClick={() => hasCampaigns && handleDateClick(date, campaigns)}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {campaigns.slice(0, 3).map(campaign => {
                        const campaignTime = campaign.type === 'fax' 
                          ? (campaign as NotifyreCampaign).sent_at
                          : (campaign as MailchimpCampaign).send_time;
                        
                        const timeDisplay = campaignTime 
                          ? format(parseISO(campaignTime), 'h:mm a')
                          : 'Time not available';

                        return (
                          <Tooltip key={campaign.id}>
                            <TooltipTrigger asChild>
                              <div
                                className="text-xs p-1 rounded truncate flex items-center gap-1"
                                style={{ backgroundColor: campaign.type === 'fax' ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--secondary) / 0.5)' }}
                              >
                                {campaign.type === 'fax' ? (
                                  <FileText className="h-3 w-3 flex-shrink-0" />
                                ) : (
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                )}
                                <span className="truncate">
                                  {campaign.type === 'fax'
                                    ? (campaign as NotifyreCampaign).campaign_name
                                    : (campaign as MailchimpCampaign).settings.title}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">
                                {campaign.type === 'fax'
                                  ? (campaign as NotifyreCampaign).campaign_name
                                  : (campaign as MailchimpCampaign).settings.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {campaign.type === 'fax' ? 'Sent' : 'Scheduled'}: {timeDisplay}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                      {campaigns.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{campaigns.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign Details Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Campaigns for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCampaigns.map(campaign => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {campaign.type === 'fax' ? (
                          <>
                            <FileText className="h-5 w-5" />
                            {(campaign as NotifyreCampaign).campaign_name}
                          </>
                        ) : (
                          <>
                            <Mail className="h-5 w-5" />
                            {(campaign as MailchimpCampaign).settings.title}
                          </>
                        )}
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={campaign.type === 'fax' ? 'default' : 'secondary'}>
                          {campaign.type === 'fax' ? 'Fax Campaign' : 'Email Campaign'}
                        </Badge>
                        {campaign.type === 'email' && (
                          <Badge variant={
                            (campaign as MailchimpCampaign).status === 'sent' ? 'default' : 'secondary'
                          }>
                            {(campaign as MailchimpCampaign).status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.type === 'fax' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Recipients</p>
                          <p className="font-medium">{(campaign as NotifyreCampaign).total_recipients}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Delivered</p>
                          <p className="font-medium text-green-600">{(campaign as NotifyreCampaign).delivered_count}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Failed</p>
                          <p className="font-medium text-red-600">{(campaign as NotifyreCampaign).failed_count}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pending</p>
                          <p className="font-medium text-orange-600">{(campaign as NotifyreCampaign).pending_count}</p>
                        </div>
                      </div>
                      {(campaign as NotifyreCampaign).contact_group_name && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">Contact Group</p>
                          <p className="font-medium">{(campaign as NotifyreCampaign).contact_group_name}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-sm">
                        <p className="text-muted-foreground">Subject</p>
                        <p className="font-medium">{(campaign as MailchimpCampaign).settings.subject_line}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Emails Sent</p>
                          <p className="font-medium">{(campaign as MailchimpCampaign).emails_sent}</p>
                        </div>
                        {(campaign as MailchimpCampaign).report_summary?.opens !== undefined && (
                          <>
                            <div>
                              <p className="text-muted-foreground">Opens</p>
                              <p className="font-medium">{(campaign as MailchimpCampaign).report_summary?.opens}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Clicks</p>
                              <p className="font-medium">{(campaign as MailchimpCampaign).report_summary?.clicks}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
