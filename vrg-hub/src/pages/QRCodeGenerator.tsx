import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  QrCode, 
  Plus, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink,
  BarChart3,
  Eye,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { formatAUDateShort } from "@/lib/dateUtils";

export default function QRCodeGenerator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [description, setDescription] = useState("");

  // Fetch QR codes
  const { data: qrCodes, isLoading } = useQuery({
    queryKey: ['qr-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch scan stats for a specific QR code
  const { data: scanStats } = useQuery({
    queryKey: ['qr-scans', selectedQR?.id],
    queryFn: async () => {
      if (!selectedQR) return null;
      
      const { data, error } = await supabase
        .from('qr_code_scans')
        .select('*')
        .eq('qr_code_id', selectedQR.id)
        .order('scanned_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedQR,
  });

  // Create QR code mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      // Generate a unique short code
      const shortCode = Math.random().toString(36).substring(2, 10);
      
      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          user_id: user?.id,
          name,
          target_url: targetUrl,
          short_code: shortCode,
          description,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
      toast.success('QR code created successfully');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create QR code');
    },
  });

  // Delete QR code mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
      toast.success('QR code deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete QR code');
    },
  });

  // Toggle active status (used by badge click)
  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('qr_codes')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
      toast.success('QR code status updated');
    }
  };

  const resetForm = () => {
    setName("");
    setTargetUrl("");
    setDescription("");
  };

  const getTrackingUrl = (shortCode: string) => {
    return `https://qr.visionradiology.com.au/${shortCode}`;
  };

  const getQRCodeImageUrl = (url: string, size: string = "256") => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
  };

  const handleCopyUrl = async (shortCode: string, id: string) => {
    try {
      await navigator.clipboard.writeText(getTrackingUrl(shortCode));
      setCopiedId(id);
      toast.success('Tracking URL copied');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handleDownloadQR = async (qr: any) => {
    try {
      const trackingUrl = getTrackingUrl(qr.short_code);
      const response = await fetch(getQRCodeImageUrl(trackingUrl, "512"));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_${qr.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('QR code downloaded');
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const handleViewStats = (qr: any) => {
    setSelectedQR(qr);
    setStatsDialogOpen(true);
  };

  // Calculate stats
  const getStatsForQR = (scans: any[]) => {
    if (!scans?.length) return { total: 0, today: 0, thisWeek: 0, devices: {} };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const todayScans = scans.filter(s => new Date(s.scanned_at) >= today).length;
    const weekScans = scans.filter(s => new Date(s.scanned_at) >= weekAgo).length;
    
    const devices: Record<string, number> = {};
    scans.forEach(s => {
      const device = s.device_type || 'Unknown';
      devices[device] = (devices[device] || 0) + 1;
    });
    
    return { total: scans.length, today: todayScans, thisWeek: weekScans, devices };
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              QR Code Generator
            </h1>
            <p className="text-muted-foreground mt-1">
              Create trackable QR codes with usage analytics
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create QR Code
          </Button>
        </div>

        {/* QR Codes List */}
        <Card>
          <CardHeader>
            <CardTitle>Your QR Codes</CardTitle>
            <CardDescription>
              Manage and track your QR codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !qrCodes?.length ? (
              <div className="text-center py-12">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No QR codes yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsCreateOpen(true)}
                >
                  Create your first QR code
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {qrCodes.map((qr) => (
                  <Card key={qr.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* QR Code Image */}
                        <div className="flex-shrink-0">
                          <div className="p-2 bg-white border rounded-lg">
                            <img
                              src={getQRCodeImageUrl(getTrackingUrl(qr.short_code), "100")}
                              alt={qr.name}
                              className="w-20 h-20"
                            />
                          </div>
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h3 className="font-medium truncate">{qr.name}</h3>
                            <Badge 
                              variant={qr.is_active ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => toggleActive(qr.id, !qr.is_active)}
                            >
                              {qr.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {qr.target_url}
                          </p>
                          
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {formatAUDateShort(new Date(qr.created_at))}
                          </p>
                          
                          {/* Actions */}
                          <div className="flex gap-1 mt-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopyUrl(qr.short_code, qr.id)}
                            >
                              {copiedId === qr.id ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownloadQR(qr)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewStats(qr)}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(qr.target_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(qr.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create QR Code Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Create QR Code
            </DialogTitle>
            <DialogDescription>
              Create a trackable QR code that redirects to your URL
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Conference Flyer, Product Manual"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetUrl">Target URL *</Label>
              <Input
                id="targetUrl"
                type="url"
                placeholder="https://example.com/page"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The URL where users will be redirected when they scan the QR code
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add notes about where this QR code is used..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Preview */}
            {targetUrl && (
              <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Preview</p>
                <div className="p-2 bg-white border rounded-lg">
                  <img
                    src={getQRCodeImageUrl(targetUrl, "256")}
                    alt="QR Preview"
                    className="w-32 h-32"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name || !targetUrl || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create QR Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              QR Code Statistics
            </DialogTitle>
            <DialogDescription>
              {selectedQR?.name} - Scan analytics and tracking data
            </DialogDescription>
          </DialogHeader>

          {selectedQR && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="scans">Recent Scans</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {(() => {
                  const stats = getStatsForQR(scanStats || []);
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <Eye className="h-6 w-6 mx-auto mb-2 text-primary" />
                            <p className="text-2xl font-bold">{stats.total}</p>
                            <p className="text-xs text-muted-foreground">Total Scans</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                            <p className="text-2xl font-bold">{stats.today}</p>
                            <p className="text-xs text-muted-foreground">Today</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                            <p className="text-2xl font-bold">{stats.thisWeek}</p>
                            <p className="text-xs text-muted-foreground">This Week</p>
                          </CardContent>
                        </Card>
                      </div>

                      {Object.keys(stats.devices).length > 0 && (
                        <Card>
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm">Device Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent className="py-3">
                            <div className="space-y-2">
                              {Object.entries(stats.devices).map(([device, count]) => (
                                <div key={device} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {device === 'Mobile' ? (
                                      <Smartphone className="h-4 w-4" />
                                    ) : device === 'Desktop' ? (
                                      <Monitor className="h-4 w-4" />
                                    ) : (
                                      <Globe className="h-4 w-4" />
                                    )}
                                    <span className="text-sm">{device}</span>
                                  </div>
                                  <Badge variant="secondary">{count}</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  );
                })()}
              </TabsContent>

              <TabsContent value="scans" className="mt-4">
                {!scanStats?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No scans recorded yet
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanStats.slice(0, 20).map((scan) => (
                          <TableRow key={scan.id}>
                            <TableCell className="text-sm">
                              {formatAUDateShort(new Date(scan.scanned_at))}
                            </TableCell>
                            <TableCell className="text-sm">
                              {scan.device_type || 'Unknown'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {scan.city && scan.country 
                                ? `${scan.city}, ${scan.country}`
                                : scan.country || 'Unknown'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
