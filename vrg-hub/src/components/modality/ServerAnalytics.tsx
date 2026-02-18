import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Server, HardDrive, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ServerLoad {
  id: string;
  name: string;
  ip_address: string;
  ae_title: string | null;
  port: number | null;
  function: string | null;
  modality_count: number;
  clinic_count: number;
}

export function ServerAnalytics() {
  const [serverLoads, setServerLoads] = useState<ServerLoad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServerAnalytics();
  }, []);

  const loadServerAnalytics = async () => {
    try {
      setLoading(true);

      // Get all DICOM servers, excluding backup PACS
      const { data: servers, error: serversError } = await supabase
        .from('dicom_servers')
        .select('*')
        .not('name', 'ilike', '%Backup PACS%')
        .not('function', 'ilike', '%Backup PACS%')
        .order('ae_title');

      if (serversError) throw serversError;

      if (!servers) {
        setServerLoads([]);
        return;
      }

      // Group servers by AE Title
      const serversByAeTitle = new Map<string, typeof servers>();
      
      servers.forEach(server => {
        const aeTitle = server.ae_title || 'Unknown';
        if (!serversByAeTitle.has(aeTitle)) {
          serversByAeTitle.set(aeTitle, []);
        }
        serversByAeTitle.get(aeTitle)!.push(server);
      });

      // For each AE Title group, aggregate counts
      const serverLoadPromises = Array.from(serversByAeTitle.entries()).map(async ([aeTitle, serverGroup]) => {
        let totalModalityCount = 0;
        const allClinicIds = new Set<string>();

        // Aggregate counts from all servers in this AE Title group
        for (const server of serverGroup) {
          // Count modalities with matching IP address
          const { count: modalityCount } = await supabase
            .from('modalities')
            .select('*', { count: 'exact', head: true })
            .or(`ip_address.eq.${server.ip_address},worklist_ip_address.eq.${server.ip_address}`);

          totalModalityCount += modalityCount || 0;

          // Get unique clinics that have this server
          const { data: clinicsData } = await supabase
            .from('dicom_servers')
            .select('clinic_id')
            .eq('ip_address', server.ip_address);

          clinicsData?.forEach(c => allClinicIds.add(c.clinic_id));
        }

        // Use the first server's details as representative
        const representative = serverGroup[0];

        return {
          id: representative.id,
          name: aeTitle,
          ip_address: serverGroup.map(s => s.ip_address).join(', '),
          ae_title: aeTitle,
          port: representative.port,
          function: representative.function,
          modality_count: totalModalityCount,
          clinic_count: allClinicIds.size,
        };
      });

      const loads = await Promise.all(serverLoadPromises);
      setServerLoads(loads);
    } catch (error) {
      console.error('Error loading server analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = serverLoads.map(server => ({
    name: server.name.length > 20 ? server.name.substring(0, 20) + '...' : server.name,
    modalities: server.modality_count,
    sites: server.clinic_count,
  }));

  const _getLoadColor = (modalityCount: number) => { void _getLoadColor;
    if (modalityCount >= 10) return 'hsl(var(--destructive))';
    if (modalityCount >= 5) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading server analytics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server Load Overview
          </CardTitle>
          <CardDescription>
            Monitor DICOM server load across modalities and sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="modalities" fill="hsl(var(--primary))" name="Modalities" />
              <Bar dataKey="sites" fill="hsl(var(--secondary))" name="Sites" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server Details</CardTitle>
          <CardDescription>
            Detailed breakdown of server load and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Server Name</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>AE Title</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Function</TableHead>
                <TableHead className="text-center">Modalities</TableHead>
                <TableHead className="text-center">Sites</TableHead>
                <TableHead className="text-center">Load Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serverLoads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No servers found
                  </TableCell>
                </TableRow>
              ) : (
                serverLoads.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">{server.name}</TableCell>
                    <TableCell className="font-mono text-xs">{server.ip_address}</TableCell>
                    <TableCell className="font-mono text-xs">{server.ae_title || '-'}</TableCell>
                    <TableCell>{server.port || '-'}</TableCell>
                    <TableCell>
                      {server.function ? (
                        <Badge variant="outline">{server.function}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{server.modality_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{server.clinic_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={
                          server.modality_count >= 10 
                            ? 'destructive' 
                            : server.modality_count >= 5 
                              ? 'default' 
                              : 'secondary'
                        }
                      >
                        {server.modality_count >= 10 
                          ? 'High' 
                          : server.modality_count >= 5 
                            ? 'Medium' 
                            : 'Low'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serverLoads.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active DICOM servers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Modalities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serverLoads.reduce((sum, s) => sum + s.modality_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Connected modalities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Load per Server</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serverLoads.length > 0
                ? (serverLoads.reduce((sum, s) => sum + s.modality_count, 0) / serverLoads.length).toFixed(1)
                : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Modalities per server
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}