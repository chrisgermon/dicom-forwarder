import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  FileUp, 
  Network,
  Server,
  MonitorDot,
  Share2,
  
  Mail,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { CloneClinicDialog } from './CloneClinicDialog';
import { Badge } from '@/components/ui/badge';
import { ExcelImporter } from './ExcelImporter';
import * as XLSX from 'xlsx';

interface Clinic {
  id: string;
  location_name: string;
  ip_range?: string;
  gateway?: string;
  site_code?: string;
  notes?: string;
  created_at: string;
}

interface DicomServer {
  id: string;
  clinic_id: string;
  name: string;
  ip_address: string;
  ae_title?: string;
  port?: number;
  function?: string;
  notes?: string;
}

interface Modality {
  id: string;
  clinic_id: string;
  name: string;
  ip_address: string;
  ae_title?: string;
  port?: number;
  worklist_ip_address?: string;
  worklist_ae_title?: string;
  worklist_port?: number;
  modality_type?: string;
  notes?: string;
  brand_id?: string;
  location_id?: string;
}

interface Brand {
  id: string;
  name: string;
  display_name: string;
}

interface Location {
  id: string;
  name: string;
  brand_id: string;
}

export function ModalityDetails() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [servers, setServers] = useState<DicomServer[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [parsedImportData, setParsedImportData] = useState<any>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showClinicDialog, setShowClinicDialog] = useState(false);
  const [showModalityDialog, setShowModalityDialog] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [editingModality, setEditingModality] = useState<Modality | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showServerDialog, setShowServerDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<DicomServer | null>(null);
  
  const { toast } = useToast();
  const { userRole } = useAuth();

  const isAdmin = userRole === 'tenant_admin' || userRole === 'super_admin';

  useEffect(() => {
    loadClinics();
    loadBrandsAndLocations();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      loadClinicData(selectedClinic);
    }
  }, [selectedClinic]);

  const loadBrandsAndLocations = async () => {
    try {
      const [brandsRes, locationsRes] = await Promise.all([
        supabase.from('brands').select('id, name, display_name').eq('is_active', true),
        supabase.from('locations').select('id, name, brand_id').eq('is_active', true),
      ]);

      if (brandsRes.error) throw brandsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setBrands(brandsRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error loading brands and locations:', error);
    }
  };

  const loadClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('location_name');

      if (error) throw error;
      setClinics(data || []);
      
      if (data && data.length > 0 && !selectedClinic) {
        setSelectedClinic(data[0].id);
      }
    } catch (error) {
      console.error('Error loading clinics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clinics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClinicData = async (clinicId: string) => {
    try {
      const [serversRes, modalitiesRes] = await Promise.all([
        supabase.from('dicom_servers').select('*').eq('clinic_id', clinicId),
        supabase.from('modalities').select('*').eq('clinic_id', clinicId),
      ]);

      if (serversRes.error) throw serversRes.error;
      if (modalitiesRes.error) throw modalitiesRes.error;

      setServers(serversRes.data || []);
      setModalities(modalitiesRes.data || []);
    } catch (error) {
      console.error('Error loading clinic data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clinic data',
        variant: 'destructive',
      });
    }
  };

  const handleImportWithAI = async () => {
    if (!importData.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste configuration data to import',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const { data: parsedData, error } = await supabase.functions.invoke('parse-modality-data', {
        body: { data: importData, type: 'configuration' }
      });

      if (error) throw error;

      // Check if we can detect brand/location
      let detectedBrand = null;
      let detectedLocation = null;

      if (parsedData.detected_brand) {
        detectedBrand = brands.find(b => 
          b.name.toLowerCase().includes(parsedData.detected_brand.toLowerCase()) ||
          b.display_name.toLowerCase().includes(parsedData.detected_brand.toLowerCase())
        );
      }

      if (parsedData.detected_location) {
        detectedLocation = locations.find(l => 
          l.name.toLowerCase().includes(parsedData.detected_location.toLowerCase())
        );
      }

      // If we couldn't detect, prompt user to select
      if (!detectedBrand || !detectedLocation) {
        setParsedImportData(parsedData);
        setSelectedBrandId(detectedBrand?.id || null);
        setSelectedLocationId(detectedLocation?.id || null);
        setShowImportDialog(false);
        setShowLocationSelector(true);
        setIsImporting(false);
        return;
      }

      // Auto-detected, proceed with import
      await completeImport(parsedData, detectedBrand.id, detectedLocation.id);
    } catch (error: any) {
      console.error('Error importing data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to import configuration',
        variant: 'destructive',
      });
      setIsImporting(false);
    }
  };

  const completeImport = async (parsedData: any, brandId: string, locationId: string) => {
    setIsImporting(true);

    try {
      // Create clinic
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          location_name: parsedData.clinic_config.location_name,
          ip_range: parsedData.clinic_config.ip_range,
          gateway: parsedData.clinic_config.gateway,
        })
        .select()
        .single();

      if (clinicError) throw clinicError;

      // Create servers
      if (parsedData.servers && parsedData.servers.length > 0) {
        const serversToInsert = parsedData.servers.map((s: any) => ({
          clinic_id: clinic.id,
          name: s.name,
          ip_address: s.ip_address,
          ae_title: s.ae_title,
          port: s.port,
          function: s.function,
        }));

        const { error: serversError } = await supabase
          .from('dicom_servers')
          .insert(serversToInsert);

        if (serversError) throw serversError;
      }

      // Create modalities with brand and location
      if (parsedData.modalities && parsedData.modalities.length > 0) {
        const modalitiesToInsert = parsedData.modalities.map((m: any) => ({
          clinic_id: clinic.id,
          name: m.name,
          ip_address: m.ip_address,
          ae_title: m.ae_title,
          port: m.port,
          worklist_ip_address: m.worklist_ip_address,
          worklist_ae_title: m.worklist_ae_title,
          worklist_port: m.worklist_port,
          modality_type: m.modality_type,
          brand_id: brandId,
          location_id: locationId,
        }));

        const { error: modalitiesError } = await supabase
          .from('modalities')
          .insert(modalitiesToInsert);

        if (modalitiesError) throw modalitiesError;
      }

      toast({
        title: 'Success',
        description: `Configuration imported successfully with ${parsedData.modalities?.length || 0} modalities`,
      });

      setShowImportDialog(false);
      setShowLocationSelector(false);
      setImportData('');
      setParsedImportData(null);
      loadClinics();
      setSelectedClinic(clinic.id);
    } catch (error: any) {
      console.error('Error completing import:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete import',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmLocationSelection = () => {
    if (!selectedBrandId || !selectedLocationId) {
      toast({
        title: 'Error',
        description: 'Please select both brand and location',
        variant: 'destructive',
      });
      return;
    }

    completeImport(parsedImportData, selectedBrandId, selectedLocationId);
  };

  const handleSaveClinic = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const clinicData = {
        location_name: formData.get('location_name') as string,
        site_code: (formData.get('site_code') as string)?.toUpperCase() || null,
        ip_range: formData.get('ip_range') as string,
        gateway: formData.get('gateway') as string,
        notes: formData.get('notes') as string,
      };

      if (editingClinic) {
        const { error } = await supabase
          .from('clinics')
          .update(clinicData)
          .eq('id', editingClinic.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clinics')
          .insert(clinicData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Clinic ${editingClinic ? 'updated' : 'created'} successfully`,
      });

      setShowClinicDialog(false);
      setEditingClinic(null);
      loadClinics();
    } catch (error) {
      console.error('Error saving clinic:', error);
      toast({
        title: 'Error',
        description: 'Failed to save clinic',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClinic = async (id: string) => {
    if (!confirm('Are you sure? This will delete all servers and modalities for this clinic.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Clinic deleted successfully',
      });

      loadClinics();
      if (selectedClinic === id) {
        setSelectedClinic(null);
      }
    } catch (error) {
      console.error('Error deleting clinic:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete clinic',
        variant: 'destructive',
      });
    }
  };

  const handleSaveModality = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!selectedClinic) {
      toast({
        title: 'Error',
        description: 'Please select a clinic first',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const modalityData = {
        clinic_id: selectedClinic,
        name: formData.get('name') as string,
        ip_address: formData.get('ip_address') as string,
        ae_title: formData.get('ae_title') as string || null,
        port: formData.get('port') ? parseInt(formData.get('port') as string) : null,
        worklist_ip_address: formData.get('worklist_ip_address') as string || null,
        worklist_ae_title: formData.get('worklist_ae_title') as string || null,
        worklist_port: formData.get('worklist_port') ? parseInt(formData.get('worklist_port') as string) : null,
        modality_type: formData.get('modality_type') as string || null,
        notes: formData.get('notes') as string || null,
        brand_id: formData.get('brand_id') as string || null,
        location_id: formData.get('location_id') as string || null,
      };

      if (editingModality) {
        // Check for duplicates when updating (exclude current record)
        const { data: existingModality } = await supabase
          .from('modalities')
          .select('id')
          .eq('clinic_id', selectedClinic)
          .eq('name', modalityData.name)
          .neq('id', editingModality.id)
          .maybeSingle();

        if (existingModality) {
          toast({
            title: 'Duplicate Entry',
            description: `A modality with the name "${modalityData.name}" already exists for this clinic`,
            variant: 'destructive',
          });
          return;
        }

        const { error } = await supabase
          .from('modalities')
          .update(modalityData)
          .eq('id', editingModality.id);

        if (error) throw error;
      } else {
        // Check for duplicates when inserting
        const { data: existingModality } = await supabase
          .from('modalities')
          .select('id')
          .eq('clinic_id', selectedClinic)
          .eq('name', modalityData.name)
          .maybeSingle();

        if (existingModality) {
          toast({
            title: 'Duplicate Entry',
            description: `A modality with the name "${modalityData.name}" already exists for this clinic`,
            variant: 'destructive',
          });
          return;
        }

        const { error } = await supabase
          .from('modalities')
          .insert(modalityData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Modality ${editingModality ? 'updated' : 'created'} successfully`,
      });

      setShowModalityDialog(false);
      setEditingModality(null);
      loadClinicData(selectedClinic);
    } catch (error) {
      console.error('Error saving modality:', error);
      toast({
        title: 'Error',
        description: 'Failed to save modality',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteModality = async (id: string) => {
    if (!confirm('Are you sure you want to delete this modality?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('modalities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Modality deleted successfully',
      });

      if (selectedClinic) {
        loadClinicData(selectedClinic);
      }
    } catch (error) {
      console.error('Error deleting modality:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete modality',
        variant: 'destructive',
      });
    }
  };

  const handleSaveServer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!selectedClinic) {
      toast({
        title: 'Error',
        description: 'Please select a clinic first',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const serverData = {
        clinic_id: selectedClinic,
        name: formData.get('name') as string,
        ip_address: formData.get('ip_address') as string,
        ae_title: formData.get('ae_title') as string || null,
        port: formData.get('port') ? parseInt(formData.get('port') as string) : null,
        function: formData.get('function') as string || null,
        notes: formData.get('notes') as string || null,
      };

      if (editingServer) {
        const { error } = await supabase
          .from('dicom_servers')
          .update(serverData)
          .eq('id', editingServer.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dicom_servers')
          .insert(serverData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `DICOM Server ${editingServer ? 'updated' : 'created'} successfully`,
      });

      setShowServerDialog(false);
      setEditingServer(null);
      loadClinicData(selectedClinic);
    } catch (error) {
      console.error('Error saving server:', error);
      toast({
        title: 'Error',
        description: 'Failed to save DICOM server',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this DICOM server?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('dicom_servers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'DICOM Server deleted successfully',
      });

      if (selectedClinic) {
        loadClinicData(selectedClinic);
      }
    } catch (error) {
      console.error('Error deleting server:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete DICOM server',
        variant: 'destructive',
      });
    }
  };

  // handleCreateShareLink removed - handleOpenShareDialog is used instead

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard',
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const handleSendEmail = async () => {
    if (!selectedClinic || !shareUrl || !recipientEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a recipient email',
        variant: 'destructive',
      });
      return;
    }

    setIsSharing(true);
    try {
      const clinic = clinics.find(c => c.id === selectedClinic);

      const { error } = await supabase.functions.invoke('share-modality-email', {
        body: {
          recipientEmail: recipientEmail.trim(),
          shareUrl,
          clinicName: clinic?.location_name,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Email sent to ${recipientEmail}`,
      });
      setShowEmailDialog(false);
      setRecipientEmail('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleExportToExcel = () => {
    if (!selectedClinic || !selectedClinicData) return;

    try {
      // Prepare clinic info
      const clinicInfo = [
        ['Clinic Information'],
        ['Location', selectedClinicData.location_name],
        ['IP Range', selectedClinicData.ip_range || '-'],
        ['Gateway', selectedClinicData.gateway || '-'],
        ['Notes', selectedClinicData.notes || '-'],
        [],
      ];

      // Prepare modalities data
      const modalitiesData = [
        ['Modalities'],
        ['Name', 'Type', 'Company', 'IP Address', 'AE Title', 'Port', 'Worklist IP', 'Worklist AE', 'Worklist Port', 'Notes'],
        ...modalities.map(m => [
          m.name,
          m.modality_type || '-',
          brands.find(b => b.id === m.brand_id)?.display_name || '-',
          m.ip_address,
          m.ae_title || '-',
          m.port?.toString() || '-',
          m.worklist_ip_address || '-',
          m.worklist_ae_title || '-',
          m.worklist_port?.toString() || '-',
          m.notes || '-',
        ]),
        [],
      ];

      // Prepare servers data
      const serversData = [
        ['DICOM Servers'],
        ['Name', 'IP Address', 'AE Title', 'Port', 'Function', 'Notes'],
        ...servers.map(s => [
          s.name,
          s.ip_address,
          s.ae_title || '-',
          s.port?.toString() || '-',
          s.function || '-',
          s.notes || '-',
        ]),
      ];

      // Combine all data
      const wsData = [...clinicInfo, ...modalitiesData, ...serversData];

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 30 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Clinic Details');

      // Generate filename
      const filename = `${selectedClinicData.location_name.replace(/[^a-z0-9]/gi, '_')}_modalities_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Success',
        description: 'Excel file downloaded successfully',
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Error',
        description: 'Failed to export to Excel',
        variant: 'destructive',
      });
    }
  };

  const handleOpenShareDialog = async () => {
    if (!selectedClinic) return;
    
    setShareUrl('');
    setIsCopied(false);
    setShowShareDialog(true);
    // Auto-generate link
    setIsSharing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-modality-share-link', {
        body: {
          clinicId: selectedClinic,
          expiresInDays: 30,
        },
      });

      if (error) throw error;
      setShareUrl(data.shareUrl);
    } catch (error: any) {
      console.error('Error creating share link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create share link',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const selectedClinicData = clinics.find(c => c.id === selectedClinic);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="w-8 h-8" />
            Modality Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage DICOM modalities, servers, and network configurations
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <ExcelImporter onSuccess={loadClinics} />
            
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileUp className="w-4 h-4 mr-2" />
                  Import Text Data
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Configuration with AI</DialogTitle>
                  <DialogDescription>
                    Paste your DICOM configuration data and AI will automatically extract and organize it
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste configuration data here..."
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowImportDialog(false)}
                      disabled={isImporting}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleImportWithAI} disabled={isImporting}>
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileUp className="w-4 h-4 mr-2" />
                          Import
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showLocationSelector} onOpenChange={setShowLocationSelector}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Company and Location</DialogTitle>
                  <DialogDescription>
                    Please select the brand and location for this modality configuration
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Company *</Label>
                    <Select value={selectedBrandId || undefined} onValueChange={setSelectedBrandId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Location *</Label>
                    <Select 
                      value={selectedLocationId || undefined} 
                      onValueChange={setSelectedLocationId}
                      disabled={!selectedBrandId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations
                          .filter(l => !selectedBrandId || l.brand_id === selectedBrandId)
                          .map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowLocationSelector(false);
                        setParsedImportData(null);
                        setSelectedBrandId(null);
                        setSelectedLocationId(null);
                      }}
                      disabled={isImporting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleConfirmLocationSelection}
                      disabled={isImporting || !selectedBrandId || !selectedLocationId}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Confirm & Import'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showClinicDialog} onOpenChange={setShowClinicDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingClinic(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Clinic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingClinic ? 'Edit' : 'Add'} Clinic</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveClinic} className="space-y-4">
                  <div>
                    <Label htmlFor="location_name">Location Name *</Label>
                    <Input
                      id="location_name"
                      name="location_name"
                      defaultValue={editingClinic?.location_name}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="site_code">Site Code (3 letters)</Label>
                    <Input
                      id="site_code"
                      name="site_code"
                      defaultValue={editingClinic?.site_code}
                      maxLength={3}
                      placeholder="e.g., VIC"
                      className="uppercase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ip_range">IP Range</Label>
                    <Input
                      id="ip_range"
                      name="ip_range"
                      defaultValue={editingClinic?.ip_range}
                      placeholder="e.g., 192.168.1.0/24"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gateway">Gateway</Label>
                    <Input
                      id="gateway"
                      name="gateway"
                      defaultValue={editingClinic?.gateway}
                      placeholder="e.g., 192.168.1.1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingClinic?.notes}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowClinicDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {clinics.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Network className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Clinics Configured</h3>
            <p className="text-muted-foreground mb-4">
              Add a clinic manually or import configuration data with AI
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Select Clinic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedClinic || undefined} onValueChange={setSelectedClinic}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedClinicData && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-medium">{selectedClinicData.location_name}</p>
                      {selectedClinicData.site_code && (
                        <Badge variant="outline" className="text-xs">{selectedClinicData.site_code}</Badge>
                      )}
                      {selectedClinicData.ip_range && (
                        <p className="text-sm text-muted-foreground">
                          IP Range: {selectedClinicData.ip_range}
                        </p>
                      )}
                      {selectedClinicData.gateway && (
                        <p className="text-sm text-muted-foreground">
                          Gateway: {selectedClinicData.gateway}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* Share button available to all users */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleOpenShareDialog}
                        title="Share clinic configuration"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      {/* Admin-only actions */}
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCloneDialog(true)}
                            title="Clone clinic"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingClinic(selectedClinicData);
                              setShowClinicDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClinic(selectedClinicData.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedClinic && (
            <Tabs defaultValue="modalities">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="modalities">
                  <MonitorDot className="w-4 h-4 mr-2" />
                  Modalities ({modalities.length})
                </TabsTrigger>
                <TabsTrigger value="servers">
                  <Server className="w-4 h-4 mr-2" />
                  DICOM Servers ({servers.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="modalities">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Modalities</CardTitle>
                    {isAdmin && (
                      <Dialog open={showModalityDialog} onOpenChange={setShowModalityDialog}>
                        <DialogTrigger asChild>
                          <Button onClick={() => setEditingModality(null)} size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Modality
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{editingModality ? 'Edit' : 'Add'} Modality</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSaveModality} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                  id="name"
                                  name="name"
                                  defaultValue={editingModality?.name}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="brand_id">Company</Label>
                                <Select name="brand_id" defaultValue={editingModality?.brand_id || undefined}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select brand" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {brands.map((brand) => (
                                      <SelectItem key={brand.id} value={brand.id}>
                                        {brand.display_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="location_id">Location</Label>
                                <Select name="location_id" defaultValue={editingModality?.location_id || undefined}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select location" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {locations.map((location) => (
                                      <SelectItem key={location.id} value={location.id}>
                                        {location.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="modality_type">Type</Label>
                                <Select name="modality_type" defaultValue={editingModality?.modality_type || undefined}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CT">CT</SelectItem>
                                    <SelectItem value="MR">MR</SelectItem>
                                    <SelectItem value="XA">XA</SelectItem>
                                    <SelectItem value="US">US</SelectItem>
                                    <SelectItem value="CR">CR</SelectItem>
                                    <SelectItem value="DX">DX</SelectItem>
                                    <SelectItem value="MG">MG</SelectItem>
                                    <SelectItem value="NM">NM</SelectItem>
                                    <SelectItem value="PT">PT</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="ip_address">IP Address *</Label>
                                <Input
                                  id="ip_address"
                                  name="ip_address"
                                  defaultValue={editingModality?.ip_address}
                                  placeholder="192.168.1.10"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="ae_title">AE Title</Label>
                                <Input
                                  id="ae_title"
                                  name="ae_title"
                                  defaultValue={editingModality?.ae_title}
                                  placeholder="MODALITY_AE"
                                />
                              </div>
                              <div>
                                <Label htmlFor="port">Port</Label>
                                <Input
                                  id="port"
                                  name="port"
                                  type="number"
                                  defaultValue={editingModality?.port}
                                  placeholder="104"
                                />
                              </div>
                              <div className="col-span-2 border-t pt-4">
                                <h4 className="font-semibold mb-3">Worklist Configuration</h4>
                              </div>
                              <div>
                                <Label htmlFor="worklist_ip_address">Worklist IP</Label>
                                <Input
                                  id="worklist_ip_address"
                                  name="worklist_ip_address"
                                  defaultValue={editingModality?.worklist_ip_address}
                                  placeholder="192.168.1.11"
                                />
                              </div>
                              <div>
                                <Label htmlFor="worklist_ae_title">Worklist AE Title</Label>
                                <Input
                                  id="worklist_ae_title"
                                  name="worklist_ae_title"
                                  defaultValue={editingModality?.worklist_ae_title}
                                  placeholder="WORKLIST_AE"
                                />
                              </div>
                              <div>
                                <Label htmlFor="worklist_port">Worklist Port</Label>
                                <Input
                                  id="worklist_port"
                                  name="worklist_port"
                                  type="number"
                                  defaultValue={editingModality?.worklist_port}
                                  placeholder="104"
                                />
                              </div>
                              <div className="col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                  id="notes"
                                  name="notes"
                                  defaultValue={editingModality?.notes}
                                  rows={3}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button type="button" variant="outline" onClick={() => setShowModalityDialog(false)}>
                                Cancel
                              </Button>
                              <Button type="submit">Save</Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent>
                    {modalities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No modalities configured for this clinic
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Company</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>IP Address</TableHead>
                              <TableHead>AE Title</TableHead>
                              <TableHead>Port</TableHead>
                              <TableHead>Worklist IP</TableHead>
                              <TableHead>Worklist AE</TableHead>
                              <TableHead>Worklist Port</TableHead>
                              {isAdmin && <TableHead>Actions</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {modalities.map((modality) => {
                              const brand = brands.find(b => b.id === modality.brand_id);
                              const location = locations.find(l => l.id === modality.location_id);
                              return (
                                <TableRow key={modality.id}>
                                  <TableCell className="font-medium">{modality.name}</TableCell>
                                  <TableCell>{brand?.display_name || '-'}</TableCell>
                                  <TableCell>{location?.name || '-'}</TableCell>
                                  <TableCell>{modality.ip_address}</TableCell>
                                  <TableCell>{modality.ae_title || '-'}</TableCell>
                                  <TableCell>{modality.port || '-'}</TableCell>
                                  <TableCell>{modality.worklist_ip_address || '-'}</TableCell>
                                  <TableCell>
                                    {modality.worklist_ae_title ? (
                                      <span className="font-mono text-xs">{modality.worklist_ae_title}</span>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                  <TableCell>{modality.worklist_port || '-'}</TableCell>
                                  {isAdmin && (
                                    <TableCell>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingModality(modality);
                                            setShowModalityDialog(true);
                                          }}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteModality(modality.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="servers">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>DICOM Servers</CardTitle>
                    {isAdmin && (
                      <Dialog open={showServerDialog} onOpenChange={setShowServerDialog}>
                        <DialogTrigger asChild>
                          <Button onClick={() => setEditingServer(null)} size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Server
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editingServer ? 'Edit' : 'Add'} DICOM Server</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSaveServer} className="space-y-4">
                            <div>
                              <Label htmlFor="server_name">Name *</Label>
                              <Input
                                id="server_name"
                                name="name"
                                defaultValue={editingServer?.name}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="server_ip_address">IP Address *</Label>
                              <Input
                                id="server_ip_address"
                                name="ip_address"
                                defaultValue={editingServer?.ip_address}
                                placeholder="192.168.1.10"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="server_ae_title">AE Title</Label>
                              <Input
                                id="server_ae_title"
                                name="ae_title"
                                defaultValue={editingServer?.ae_title}
                                placeholder="SERVER_AE"
                              />
                            </div>
                            <div>
                              <Label htmlFor="server_port">Port</Label>
                              <Input
                                id="server_port"
                                name="port"
                                type="number"
                                defaultValue={editingServer?.port}
                                placeholder="104"
                              />
                            </div>
                            <div>
                              <Label htmlFor="server_function">Function</Label>
                              <Select name="function" defaultValue={editingServer?.function || undefined}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select function" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PACS">PACS</SelectItem>
                                  <SelectItem value="RIS">RIS</SelectItem>
                                  <SelectItem value="Worklist">Worklist</SelectItem>
                                  <SelectItem value="Archive">Archive</SelectItem>
                                  <SelectItem value="Router">Router</SelectItem>
                                  <SelectItem value="Printer">Printer</SelectItem>
                                  <SelectItem value="Storage">Storage</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="server_notes">Notes</Label>
                              <Textarea
                                id="server_notes"
                                name="notes"
                                defaultValue={editingServer?.notes}
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button type="button" variant="outline" onClick={() => setShowServerDialog(false)}>
                                Cancel
                              </Button>
                              <Button type="submit">Save</Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent>
                    {servers.length === 0 ? (
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
                              {isAdmin && <TableHead>Actions</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {servers.map((server) => (
                              <TableRow key={server.id}>
                                <TableCell className="font-medium">{server.name}</TableCell>
                                <TableCell>{server.ip_address}</TableCell>
                                <TableCell>
                                  {server.ae_title ? (
                                    <span className="inline-block px-2 py-1 bg-primary/10 text-primary font-mono text-sm font-semibold rounded">
                                      {server.ae_title}
                                    </span>
                                  ) : '-'}
                                </TableCell>
                                <TableCell>{server.port || '-'}</TableCell>
                                <TableCell>{server.function || '-'}</TableCell>
                                {isAdmin && (
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingServer(server);
                                          setShowServerDialog(true);
                                        }}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteServer(server.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
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
          )}
        </>
      )}

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Clinic: {selectedClinicData?.location_name}</DialogTitle>
            <DialogDescription>
              Share all modalities and DICOM servers for this clinic via encrypted link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isSharing ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : shareUrl ? (
              <>
                <div className="space-y-2">
                  <Label>Shareable Link</Label>
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly className="font-mono text-sm" />
                    <Button onClick={handleCopyLink} variant="outline" size="icon">
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This link expires in 30 days and can be accessed publicly
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowShareDialog(false);
                      setShowEmailDialog(true);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Link
                  </Button>
                  <Button
                    onClick={handleExportToExcel}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Modality Details</DialogTitle>
            <DialogDescription>
              Send configuration details to a recipient
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Email</Label>
              <Input
                id="recipient"
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Share Link</Label>
              <Input value={shareUrl} readOnly className="font-mono text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSharing || !recipientEmail.trim()}>
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CloneClinicDialog
        open={showCloneDialog}
        onOpenChange={setShowCloneDialog}
        sourceClinic={selectedClinicData || null}
        sourceModalities={modalities}
        sourceServers={servers}
        brands={brands}
        locations={locations}
        onSuccess={loadClinics}
      />
    </div>
  );
}
