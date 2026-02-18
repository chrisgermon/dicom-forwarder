import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Mail, Send, XCircle, FileText, Eye, CheckCircle, ArrowUpDown, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

interface Campaign {
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
}

interface RecipientDetail {
  email_address: string;
  status: string;
  open_count: number;
  click_count: number;
  last_open?: string;
  last_click?: string;
}

const MailchimpCampaigns = () => {
  const [selectedCampaign, setSelectedCampaign] = React.useState<Campaign | null>(null);
  const [recipients, setRecipients] = React.useState<RecipientDetail[]>([]);
  const [loadingRecipients, setLoadingRecipients] = React.useState(false);
  const [sortField, setSortField] = React.useState<keyof RecipientDetail>('email_address');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ['mailchimp-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-mailchimp-campaigns');
      if (error) throw error;
      return data.campaigns as Campaign[];
    },
  });

  const handleRefresh = async () => {
    toast.loading("Refreshing campaigns...");
    await refetch();
    toast.dismiss();
    toast.success("Campaigns refreshed!");
  };

  const fetchRecipients = async (campaignId: string) => {
    setLoadingRecipients(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-mailchimp-campaign-details', {
        body: { campaignId },
      });
      if (error) throw error;
      setRecipients(data.recipients || []);
    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast.error("Failed to load recipient details");
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSortField('email_address');
    setSortDirection('asc');
    fetchRecipients(campaign.id);
  };

  const handleSort = (field: keyof RecipientDetail) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRecipients = React.useMemo(() => {
    return [...recipients].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [recipients, sortField, sortDirection]);

  const handleExport = () => {
    if (!selectedCampaign) return;

    const campaignInfo = [
      ['Campaign Details'],
      ['Title', selectedCampaign.settings.title],
      ['Subject', selectedCampaign.settings.subject_line],
      ['Status', selectedCampaign.status],
      ['Emails Sent', selectedCampaign.emails_sent],
      ['Send Date', selectedCampaign.send_time ? new Date(selectedCampaign.send_time).toLocaleString() : 'Not sent'],
      [],
      ['Recipients']
    ];

    const recipientData = sortedRecipients.map(r => ({
      'Email': r.email_address,
      'Status': r.status,
      'Opens': r.open_count,
      'Clicks': r.click_count,
      'Last Activity': r.last_open 
        ? new Date(r.last_open).toLocaleString()
        : r.last_click
        ? new Date(r.last_click).toLocaleString()
        : 'No activity'
    }));

    const ws = XLSX.utils.aoa_to_sheet(campaignInfo);
    XLSX.utils.sheet_add_json(ws, recipientData, { origin: -1 });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Campaign Details');
    
    const fileName = `${selectedCampaign.settings.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success("Campaign details exported!");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ComponentType<any> }> = {
      sent: { variant: "default", icon: Send },
      sending: { variant: "secondary", icon: Mail },
      draft: { variant: "outline", icon: FileText },
      save: { variant: "outline", icon: FileText },
      failed: { variant: "destructive", icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const sentCampaigns = campaigns?.filter(c => c.status === 'sent') || [];
  const failedCampaigns = campaigns?.filter(c => c.status === 'failed') || [];
  const draftCampaigns = campaigns?.filter(c => c.status === 'save' || c.status === 'draft') || [];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Mailchimp Campaigns"
        description="View and analyze your email campaign performance"
        actions={
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">Successfully sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">Failed to send</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Campaigns</TabsTrigger>
          <TabsTrigger value="sent">Delivered</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CampaignTable campaigns={campaigns} getStatusBadge={getStatusBadge} onCampaignClick={handleCampaignClick} />
        </TabsContent>

        <TabsContent value="sent">
          <CampaignTable 
            campaigns={sentCampaigns} 
            getStatusBadge={getStatusBadge}
            onCampaignClick={handleCampaignClick}
          />
        </TabsContent>

        <TabsContent value="failed">
          <CampaignTable 
            campaigns={failedCampaigns} 
            getStatusBadge={getStatusBadge}
            onCampaignClick={handleCampaignClick}
          />
        </TabsContent>

        <TabsContent value="draft">
          <CampaignTable 
            campaigns={draftCampaigns} 
            getStatusBadge={getStatusBadge}
            onCampaignClick={handleCampaignClick}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selectedCampaign?.settings.title}</DialogTitle>
              <Button onClick={handleExport} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="font-medium">{selectedCampaign?.settings.subject_line}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  {selectedCampaign && getStatusBadge(selectedCampaign.status)}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="font-medium">{selectedCampaign?.emails_sent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sent Date</p>
                <p className="font-medium">
                  {selectedCampaign?.send_time 
                    ? new Date(selectedCampaign.send_time).toLocaleString()
                    : 'Not sent'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Recipients ({recipients.length})</h3>
              {loadingRecipients ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span className="text-muted-foreground">Loading recipients...</span>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('email_address')}
                      >
                        <div className="flex items-center gap-1">
                          Email
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          Status
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('open_count')}
                      >
                        <div className="flex items-center gap-1">
                          Opens
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('click_count')}
                      >
                        <div className="flex items-center gap-1">
                          Clicks
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('last_open')}
                      >
                        <div className="flex items-center gap-1">
                          Last Activity
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRecipients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No recipient details available
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedRecipients.map((recipient) => (
                        <TableRow key={recipient.email_address}>
                          <TableCell className="font-medium">{recipient.email_address}</TableCell>
                          <TableCell>
                            <Badge variant={recipient.status === 'sent' ? 'default' : 'secondary'}>
                              {recipient.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{recipient.open_count}</TableCell>
                          <TableCell>{recipient.click_count}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {recipient.last_open 
                              ? new Date(recipient.last_open).toLocaleString()
                              : recipient.last_click
                              ? new Date(recipient.last_click).toLocaleString()
                              : 'No activity'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

const CampaignTable = ({ 
  campaigns, 
  getStatusBadge,
  onCampaignClick
}: { 
  campaigns?: Campaign[]; 
  getStatusBadge: (status: string) => React.ReactNode;
  onCampaignClick: (campaign: Campaign) => void;
}) => {
  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No campaigns found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign Name</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Opens</TableHead>
            <TableHead>Clicks</TableHead>
            <TableHead>Send Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">{campaign.settings.title}</TableCell>
              <TableCell>{campaign.settings.subject_line}</TableCell>
              <TableCell>{getStatusBadge(campaign.status)}</TableCell>
              <TableCell>{campaign.emails_sent.toLocaleString()}</TableCell>
              <TableCell>{campaign.report_summary?.unique_opens?.toLocaleString() || 0}</TableCell>
              <TableCell>{campaign.report_summary?.subscriber_clicks?.toLocaleString() || 0}</TableCell>
              <TableCell>
                {campaign.send_time 
                  ? new Date(campaign.send_time).toLocaleDateString()
                  : 'Not sent'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCampaignClick(campaign)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default MailchimpCampaigns;
