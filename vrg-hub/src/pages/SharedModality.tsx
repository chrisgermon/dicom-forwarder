import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, Network, Server, MonitorDot } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SharedModality() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetchSharedClinic();
    }
  }, [token]);

  const fetchSharedClinic = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[SharedModality] Fetching with token:', token);
      console.log('[SharedModality] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      // Call the edge function with the token as a query parameter
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-modality?token=${token}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[SharedModality] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SharedModality] Error response:', errorData);
        throw new Error(errorData.error || 'Failed to load shared clinic');
      }

      const responseData = await response.json();
      console.log('[SharedModality] Success:', responseData);
      setData(responseData);
    } catch (err: any) {
      console.error('Error fetching shared clinic:', err);
      setError(err.message || 'Failed to load clinic');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading clinic details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data || !data.clinic) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Clinic not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { clinic, modalities, servers } = data;

  // Get the brand logo from the first modality (all should have the same brand for a clinic)
  const brandLogo = modalities?.[0]?.brand?.logo_url;
  const brandName = modalities?.[0]?.brand?.display_name;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          {brandLogo ? (
            <img 
              src={brandLogo} 
              alt={brandName || 'Company logo'} 
              className="h-12 w-auto object-contain"
            />
          ) : (
            <Network className="w-8 h-8" />
          )}
          <div>
            <h1 className="text-3xl font-bold">{clinic.location_name}</h1>
            {brandName && (
              <p className="text-muted-foreground">{brandName}</p>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          View-only access to clinic modalities and DICOM configuration
        </p>
      </div>

      {/* Clinic Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorDot className="w-5 h-5" />
            {clinic.location_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clinic.ip_range && (
              <div>
                <p className="text-sm text-muted-foreground">IP Range</p>
                <p className="font-medium">{clinic.ip_range}</p>
              </div>
            )}
            {clinic.gateway && (
              <div>
                <p className="text-sm text-muted-foreground">Gateway</p>
                <p className="font-medium">{clinic.gateway}</p>
              </div>
            )}
          </div>
          {clinic.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{clinic.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="modalities" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="modalities">
            <MonitorDot className="w-4 h-4 mr-2" />
            Modalities ({modalities?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="servers">
            <Server className="w-4 h-4 mr-2" />
            DICOM Servers ({servers?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modalities">
          <Card>
            <CardHeader>
              <CardTitle>Modalities</CardTitle>
            </CardHeader>
            <CardContent>
              {!modalities || modalities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No modalities configured for this clinic
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>AE Title</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead>Worklist IP</TableHead>
                        <TableHead>Worklist AE</TableHead>
                        <TableHead>Worklist Port</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modalities.map((modality: any) => (
                        <TableRow key={modality.id}>
                          <TableCell className="font-medium">{modality.name}</TableCell>
                          <TableCell>
                            {modality.modality_type ? (
                              <Badge>{modality.modality_type}</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{modality.brand?.display_name || '-'}</TableCell>
                          <TableCell>{modality.location?.name || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{modality.ip_address}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {modality.ae_title || '-'}
                          </TableCell>
                          <TableCell>{modality.port || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{modality.worklist_ip_address || '-'}</TableCell>
                          <TableCell>
                            {modality.worklist_ae_title ? (
                              <span className="font-mono text-xs">{modality.worklist_ae_title}</span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{modality.worklist_port || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                DICOM Servers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!servers || servers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No DICOM servers configured for this clinic
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>AE Title</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead>Function</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {servers.map((server: any) => (
                        <TableRow key={server.id}>
                          <TableCell className="font-medium">{server.name}</TableCell>
                          <TableCell className="font-mono text-sm">{server.ip_address}</TableCell>
                          <TableCell className="font-mono text-sm">{server.ae_title || '-'}</TableCell>
                          <TableCell>{server.port || '-'}</TableCell>
                          <TableCell>{server.function || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>This is a read-only view of the clinic configuration</p>
        <p>Shared via Vision Radiology Hub</p>
      </div>
    </div>
  );
}