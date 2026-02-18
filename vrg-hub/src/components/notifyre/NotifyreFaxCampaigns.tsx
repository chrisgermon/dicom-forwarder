import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { CampaignBrandLocationSelect } from "@/components/marketing/CampaignBrandLocationSelect";

interface FaxCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string;
  contact_group_id: string | null;
  contact_group_name: string | null;
  total_recipients: number;
  delivered_count: number;
  failed_count: number;
  pending_count: number;
  sent_at: string;
  document_path: string | null;
  created_at: string;
  brand_id?: string | null;
  location_id?: string | null;
}

interface FaxLog {
  id: string;
  notifyre_fax_id: string;
  recipient_number: string;
  recipient_name: string | null;
  status: string;
  error_message: string | null;
  pages_sent: number | null;
  cost_cents: number | null;
  sent_at: string;
  delivered_at: string | null;
  failed_at: string | null;
}

interface SyncHistory {
  id: string;
  created_at: string;
  status: string;
  campaigns_synced: number;
  faxes_synced: number;
}

export const NotifyreFaxCampaigns = () => {
  const [campaigns, setCampaigns] = useState<FaxCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<FaxCampaign | null>(null);
  const [faxLogs, setFaxLogs] = useState<FaxLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [lastSync, setLastSync] = useState<SyncHistory | null>(null);

  useEffect(() => {
    loadCampaigns();
    loadLastSyncTime();
  }, []);

  const loadLastSyncTime = async () => {
    try {
      const { data, error } = await supabase
        .from('notifyre_sync_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setLastSync(data);
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifyre_fax_campaigns')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load fax campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignLogs = async (campaignId: string) => {
    try {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from('notifyre_fax_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setFaxLogs(data || []);
    } catch (error) {
      console.error('Error loading fax logs:', error);
      toast.error('Failed to load fax logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSyncFaxes = async () => {
    try {
      setSyncing(true);
      toast.info('Running full sync from Notifyre...');

      const { data, error } = await supabase.functions.invoke('sync-notifyre-fax-logs', {
        body: { force_full_sync: true }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Synced ${data.campaigns} campaigns with ${data.faxes} faxes`);
        await loadCampaigns();
        await loadLastSyncTime();
      } else {
        toast.error(data?.message || 'Failed to sync faxes');
      }
    } catch (error) {
      console.error('Error syncing faxes:', error);
      toast.error('Failed to sync fax campaigns');
    } finally {
      setSyncing(false);
    }
  };

  const handleViewCampaign = (campaign: FaxCampaign) => {
    setSelectedCampaign(campaign);
    loadCampaignLogs(campaign.id);
  };

  const handleRefreshLogs = async () => {
    if (!selectedCampaign) return;
    
    toast.info('Refreshing campaign data...');
    await loadCampaigns();
    await loadCampaignLogs(selectedCampaign.id);
    
    // Update the selected campaign with fresh data
    const { data } = await supabase
      .from('notifyre_fax_campaigns')
      .select('*')
      .eq('id', selectedCampaign.id)
      .single();
    
    if (data) {
      setSelectedCampaign(data);
      toast.success('Campaign data refreshed');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (['delivered', 'sent', 'successful'].includes(statusLower)) {
      return <Badge variant="success" className="gap-1"><CheckCircle className="w-3 h-3" /> Delivered</Badge>;
    }
    if (['failed', 'error'].includes(statusLower)) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
  };

  if (selectedCampaign) {
    return (
      <div className="flex gap-0 -m-3 md:-m-6">
        <div className="flex-1 min-w-0 p-3 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Button variant="outline" onClick={() => setSelectedCampaign(null)}>
                ← Back to Campaigns
              </Button>
              <h2 className="text-2xl font-bold mt-4">{selectedCampaign.campaign_name}</h2>
              <p className="text-muted-foreground">
                {formatAUDateTimeFull(selectedCampaign.sent_at)}
              </p>
            </div>
            <Button onClick={handleRefreshLogs} disabled={loadingLogs}>
              {loadingLogs ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </>
              )}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedCampaign.total_recipients}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{selectedCampaign.delivered_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{selectedCampaign.failed_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{selectedCampaign.pending_count}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fax Delivery Log</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : faxLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No fax logs found for this campaign
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pages</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Sent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faxLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.recipient_name || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{log.recipient_number}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>{log.pages_sent || '-'}</TableCell>
                          <TableCell>
                            {log.cost_cents ? `$${(log.cost_cents / 100).toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.sent_at ? formatAUDateTimeFull(log.sent_at) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 -m-3 md:-m-6 p-3 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fax Campaigns</h1>
          <p className="text-muted-foreground">
            View and manage Notifyre fax campaigns
            {lastSync && (
              <span className="ml-2">
                • Last synced: {formatAUDateTimeFull(lastSync.created_at)}
              </span>
            )}
          </p>
        </div>
        <Button onClick={handleSyncFaxes} disabled={syncing}>
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Faxes
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fax campaigns found. Click "Sync Faxes" to load campaigns from Notifyre.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Company & Location</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.campaign_name}</TableCell>
                      <TableCell>{campaign.total_recipients}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">{campaign.delivered_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600 font-medium">{campaign.failed_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-600 font-medium">{campaign.pending_count}</span>
                      </TableCell>
                      <TableCell>
                        <CampaignBrandLocationSelect
                          campaignId={campaign.id}
                          campaignType="fax"
                          currentBrandId={campaign.brand_id}
                          currentLocationId={campaign.location_id}
                          onUpdate={loadCampaigns}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatAUDateTimeFull(campaign.sent_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCampaign(campaign)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
