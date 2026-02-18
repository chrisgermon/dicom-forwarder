import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, FolderOpen, Link as LinkIcon, RefreshCw, Unplug } from 'lucide-react';
import { ConnectOffice365Button } from '@/components/documentation/ConnectOffice365Button';

interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
}

export function SharePointConfiguration() {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const { toast } = useToast();
  const TARGET_SITE_NAME = 'vrgdocuments';

  useEffect(() => {
    checkConnection();
    loadCurrentConfig();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connection } = await supabase
        .from('office365_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setConnected(!!connection);
      
      if (connection) {
        await autoConfigureVRGDocuments();
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const loadCurrentConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connection } = await supabase
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!connection) return;

      const { data: config } = await supabase
        .from('sharepoint_configurations')
        .select('*')
        .eq('company_id', connection.company_id)
        .eq('is_active', true)
        .maybeSingle();

      if (config) {
        setCurrentConfig(config);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const autoConfigureVRGDocuments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connection } = await supabase
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!connection?.company_id) {
        toast({
          title: 'Error',
          description: 'Please connect to Office 365 first',
          variant: 'destructive'
        });
        return;
      }

      // Fetch sites to find vrgdocuments
      const { data, error } = await supabase.functions.invoke('sharepoint-get-sites', {
        body: { company_id: connection.company_id }
      });

      if (error) throw error;

      const vrgSite = data?.sites?.find((s: SharePointSite) => 
        s.name.toLowerCase() === TARGET_SITE_NAME.toLowerCase()
      );

      if (!vrgSite) {
        toast({
          title: 'Site not found',
          description: `Could not find SharePoint site "${TARGET_SITE_NAME}"`,
          variant: 'destructive'
        });
        return;
      }

      // Clear old cache for this company
      await supabase
        .from('sharepoint_cache')
        .delete()
        .eq('company_id', connection.company_id);

      // Save configuration
      const { data: existingConfig } = await supabase
        .from('sharepoint_configurations')
        .select('id')
        .eq('company_id', connection.company_id)
        .maybeSingle();

      const configData = {
        site_id: vrgSite.id,
        site_name: vrgSite.name,
        site_url: vrgSite.webUrl,
        folder_path: '/',
        configured_by: user.id,
        is_active: true,
      };

      if (existingConfig?.id) {
        await supabase
          .from('sharepoint_configurations')
          .update(configData)
          .eq('id', existingConfig.id);
      } else {
        await supabase
          .from('sharepoint_configurations')
          .insert({
            ...configData,
            company_id: connection.company_id,
          });
      }

      await loadCurrentConfig();
      
      toast({
        title: 'Success',
        description: `Connected to ${TARGET_SITE_NAME} - cache cleared`,
      });
    } catch (error: any) {
      console.error('Error configuring:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to configure SharePoint',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

   const reconfigure = async () => {
     await autoConfigureVRGDocuments();
   };

   const connectCompanyOffice365 = async () => {
     setLoading(true);
     try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) {
         toast({ title: 'Sign in required', description: 'Please sign in again', variant: 'destructive' });
         return;
       }

       // Resolve company id (prefer existing connection, fallback to profile brand)
       let resolvedCompanyId: string | undefined;
       const { data: userConn } = await supabase
         .from('office365_connections')
         .select('company_id')
         .eq('user_id', session.user.id)
         .order('updated_at', { ascending: false })
         .maybeSingle();
       resolvedCompanyId = userConn?.company_id;
       if (!resolvedCompanyId) {
         const { data: profile } = await supabase
           .from('profiles')
           .select('brand_id')
           .eq('id', session.user.id)
           .maybeSingle();
         resolvedCompanyId = profile?.brand_id || undefined;
       }

       if (!resolvedCompanyId) {
         toast({ title: 'Missing company', description: 'No company context found to connect.', variant: 'destructive' });
         return;
       }

       const { data, error } = await supabase.functions.invoke('office365-oauth-initiate', {
         body: { company_id: resolvedCompanyId },
         headers: { Authorization: `Bearer ${session.access_token}` },
       });
       if (error) throw error;

       const authUrl = (data as any)?.authorization_url || (data as any)?.authUrl;
       const width = 600, height = 700;
       const left = window.screen.width / 2 - width / 2;
       const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          authUrl,
          'office365-company-auth',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no,noopener=no`
        );
       popup?.focus();

       const handleMessage = (event: MessageEvent) => {
         if ((event.data as any)?.type === 'office365-connected') {
           window.removeEventListener('message', handleMessage);
           toast({ title: 'Connected', description: 'Company Office 365 connected' });
           checkConnection();
           loadCurrentConfig();
         }
       };
       window.addEventListener('message', handleMessage);
     } catch (e: any) {
       console.error('Company O365 connect error', e);
       toast({ title: 'Error', description: e?.message || 'Failed to start connection', variant: 'destructive' });
     } finally {
       setLoading(false);
     }
   };
  const disconnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('sharepoint-disconnect');

      if (error) throw error;

      setConnected(false);
      setCurrentConfig(null);
      
      toast({
        title: 'Disconnected',
        description: 'SharePoint has been disconnected successfully',
      });
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect SharePoint',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            SharePoint Configuration
          </CardTitle>
          <CardDescription>
            Connect Office 365 to configure SharePoint access for your company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Connect your Office 365 account or connect the company to configure SharePoint document access
            </p>
            <div className="flex gap-3">
              <ConnectOffice365Button />
              <Button variant="outline" onClick={connectCompanyOffice365} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect Company Office 365
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          SharePoint Configuration
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        </CardTitle>
        <CardDescription>
          Automatically connected to {TARGET_SITE_NAME}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentConfig && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LinkIcon className="w-4 h-4" />
              Active Configuration
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site:</span>
                <span className="font-medium">{currentConfig.site_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Path:</span>
                <span className="font-medium">{currentConfig.folder_path}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={reconfigure} 
            disabled={loading}
            className="flex-1"
            variant="outline"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <RefreshCw className="w-4 h-4 mr-2" />
            Reconnect & Clear Cache
          </Button>
          
          <Button 
            onClick={disconnect} 
            disabled={loading}
            variant="destructive"
            className="flex-1"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Unplug className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
