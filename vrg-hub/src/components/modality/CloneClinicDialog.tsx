import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy } from 'lucide-react';

interface Clinic {
  id: string;
  location_name: string;
  ip_range?: string;
  gateway?: string;
  site_code?: string;
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

interface CloneClinicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceClinic: Clinic | null;
  sourceModalities: Modality[];
  sourceServers: DicomServer[];
  brands: Brand[];
  locations: Location[];
  onSuccess: () => void;
}

const MODALITY_TYPES = [
  { id: 'CT', label: 'CT' },
  { id: 'Xray', label: 'X-ray' },
  { id: 'Ultrasound', label: 'Ultrasound' },
  { id: 'MRI', label: 'MRI' },
  { id: 'DEXA', label: 'DEXA' },
  { id: 'Film Printer', label: 'Film Printer' },
  { id: 'Lumicare', label: 'Lumicare' },
  { id: 'OPG', label: 'OPG' },
];

export function CloneClinicDialog({
  open,
  onOpenChange,
  sourceClinic,
  sourceModalities,
  sourceServers,
  brands,
  locations,
  onSuccess,
}: CloneClinicDialogProps) {
  const [isCloning, setIsCloning] = useState(false);
  const [subnet, setSubnet] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedModalityTypes, setSelectedModalityTypes] = useState<string[]>([]);
  const [ultrasoundQuantity, setUltrasoundQuantity] = useState(1);
  
  const { toast } = useToast();

  const filteredLocations = locations.filter(l => l.brand_id === selectedBrandId);

  // Reset form when dialog opens with new source
  useEffect(() => {
    if (open && sourceClinic) {
      setSubnet('');
      setSiteName('');
      setSiteCode('');
      setSelectedBrandId('');
      setSelectedLocationId('');
      setSelectedModalityTypes([]);
      setUltrasoundQuantity(1);
    }
  }, [open, sourceClinic]);

  const handleModalityTypeToggle = (typeId: string) => {
    setSelectedModalityTypes(prev => 
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const generateAeTitle = (originalAeTitle: string, newSiteCode: string): string => {
    if (!originalAeTitle || !newSiteCode) return originalAeTitle || '';
    
    // Extract the suffix (e.g., CR, CRWL, MR, etc.)
    // Pattern: first 3 chars are site code, rest is modality suffix
    const suffix = originalAeTitle.substring(3);
    return `${newSiteCode.toUpperCase()}${suffix}`;
  };

  const updateIpAddress = (originalIp: string, newSubnet: string): string => {
    if (!originalIp || !newSubnet) return originalIp || '';
    
    // Extract last two octets from original IP
    const originalParts = originalIp.split('.');
    if (originalParts.length !== 4) return originalIp;
    
    // Parse new subnet (e.g., "192.168.94" or just "94")
    let subnetBase = newSubnet;
    
    // If only third octet provided, assume same first two octets
    if (!newSubnet.includes('.')) {
      const firstTwo = originalParts.slice(0, 2).join('.');
      subnetBase = `${firstTwo}.${newSubnet}`;
    } else if (newSubnet.split('.').length === 3) {
      // Full subnet provided (e.g., "192.168.94")
      subnetBase = newSubnet;
    }
    
    // Keep the last octet from original
    return `${subnetBase}.${originalParts[3]}`;
  };

  const updateName = (originalName: string, newSiteName: string): string => {
    if (!originalName || !newSiteName || !sourceClinic) return originalName || '';
    
    // Replace the source clinic name with new site name
    const sourceName = sourceClinic.location_name;
    
    // Try to find and replace the source clinic name in the modality name
    if (originalName.includes(sourceName)) {
      return originalName.replace(sourceName, newSiteName);
    }
    
    // If exact match not found, try to replace first word(s) before modality type
    const modalityTypes = ['CT', 'Xray', 'X-ray', 'Ultrasound', 'US', 'MRI', 'DEXA', 'OPG', 'Film Printer', 'Lumicare'];
    for (const type of modalityTypes) {
      const typeIndex = originalName.indexOf(type);
      if (typeIndex > 0) {
        return `${newSiteName} ${originalName.substring(typeIndex)}`;
      }
    }
    
    return `${newSiteName} ${originalName}`;
  };

  const handleClone = async () => {
    if (!sourceClinic) return;

    // Validation
    if (!subnet.trim()) {
      toast({ title: 'Error', description: 'Please enter a subnet', variant: 'destructive' });
      return;
    }
    if (!siteName.trim()) {
      toast({ title: 'Error', description: 'Please enter a site name', variant: 'destructive' });
      return;
    }
    if (!siteCode.trim() || siteCode.length !== 3) {
      toast({ title: 'Error', description: 'Site code must be exactly 3 letters', variant: 'destructive' });
      return;
    }
    if (!selectedBrandId) {
      toast({ title: 'Error', description: 'Please select a company', variant: 'destructive' });
      return;
    }
    if (!selectedLocationId) {
      toast({ title: 'Error', description: 'Please select a location', variant: 'destructive' });
      return;
    }
    if (selectedModalityTypes.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one modality type', variant: 'destructive' });
      return;
    }

    setIsCloning(true);

    try {
      // Create new clinic
      const { data: newClinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          location_name: siteName,
          site_code: siteCode.toUpperCase(),
          ip_range: sourceClinic.ip_range ? updateIpAddress(sourceClinic.ip_range, subnet) : null,
          gateway: sourceClinic.gateway ? updateIpAddress(sourceClinic.gateway, subnet) : null,
          notes: `Cloned from ${sourceClinic.location_name}`,
        })
        .select()
        .single();

      if (clinicError) throw clinicError;

      // Clone DICOM servers
      if (sourceServers.length > 0) {
        const serversToInsert = sourceServers.map(server => ({
          clinic_id: newClinic.id,
          name: updateName(server.name, siteName),
          ip_address: updateIpAddress(server.ip_address, subnet),
          ae_title: server.ae_title ? generateAeTitle(server.ae_title, siteCode) : null,
          port: server.port,
          function: server.function,
          notes: server.notes,
        }));

        const { error: serversError } = await supabase
          .from('dicom_servers')
          .insert(serversToInsert);

        if (serversError) throw serversError;
      }

      // Filter and clone modalities based on selected types
      const modalitiesByType = sourceModalities.filter(m => {
        const modalityType = m.modality_type?.toLowerCase() || '';
        const modalityName = m.name.toLowerCase();
        
        return selectedModalityTypes.some(selectedType => {
          const selectedLower = selectedType.toLowerCase();
          
          // Handle special abbreviations/aliases
          if (selectedType === 'Ultrasound') {
            return modalityType === 'us' || modalityName.includes('ultrasound') || modalityName.includes(' us ') || modalityName.includes(' us') || modalityName.endsWith(' us');
          }
          if (selectedType === 'DEXA') {
            return modalityType === 'dx' || modalityType === 'dexa' || modalityName.includes('dexa');
          }
          if (selectedType === 'Xray') {
            return modalityType === 'cr' || modalityType === 'dx' && !modalityName.includes('dexa') || 
                   modalityName.includes('x-ray') || modalityName.includes('xray') || 
                   (modalityName.includes('cr') && !modalityName.includes('lumicare'));
          }
          if (selectedType === 'CT') {
            return modalityType === 'ct' || modalityName.includes(' ct') || modalityName.endsWith(' ct');
          }
          if (selectedType === 'Film Printer') {
            return modalityName.includes('film') || modalityName.includes('printer');
          }
          if (selectedType === 'Lumicare') {
            return modalityName.includes('lumicare');
          }
          if (selectedType === 'OPG') {
            return modalityName.includes('opg');
          }
          if (selectedType === 'MRI') {
            return modalityType === 'mr' || modalityType === 'mri' || modalityName.includes('mri') || modalityName.includes(' mr ');
          }
          
          return modalityType.includes(selectedLower) || modalityName.includes(selectedLower);
        });
      });

      if (modalitiesByType.length > 0) {
        const modalitiesToInsert: any[] = [];
        let ultrasoundTemplateUsed = false;

        for (const modality of modalitiesByType) {
          const modalityNameLower = modality.name.toLowerCase();
          const isUltrasound = modality.modality_type?.toLowerCase() === 'us' ||
                              modalityNameLower.includes('ultrasound') ||
                              modalityNameLower.includes(' us ') ||
                              modalityNameLower.includes(' us') ||
                              modalityNameLower.endsWith(' us');
          
          // For ultrasound, only use the first one as a template and create specified quantity
          if (isUltrasound) {
            if (ultrasoundTemplateUsed) continue;
            ultrasoundTemplateUsed = true;
            
            for (let i = 0; i < ultrasoundQuantity; i++) {
              let ipAddress = updateIpAddress(modality.ip_address, subnet);
              let worklistIp = modality.worklist_ip_address ? updateIpAddress(modality.worklist_ip_address, subnet) : null;
              let aeTitle = modality.ae_title ? generateAeTitle(modality.ae_title, siteCode) : null;
              let worklistAeTitle = modality.worklist_ae_title ? generateAeTitle(modality.worklist_ae_title, siteCode) : null;

              // Adjust IP for multiple ultrasound units
              const ipParts = ipAddress.split('.');
              if (ipParts.length === 4) {
                const lastOctet = parseInt(ipParts[3]) + i;
                ipAddress = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${lastOctet}`;
              }
              
              // Generate name with room number
              const baseName = updateName(modality.name, siteName).replace(/\s*\d+\s*$/, '').trim();
              const name = `${baseName} ${i + 1}`;
              
              if (aeTitle) {
                const baseAe = aeTitle.replace(/\d+$/, '');
                aeTitle = `${baseAe}${i + 1}`;
              }
              if (worklistAeTitle) {
                const baseWlAe = worklistAeTitle.replace(/\d+$/, '');
                worklistAeTitle = `${baseWlAe}${i + 1}`;
              }

              modalitiesToInsert.push({
                clinic_id: newClinic.id,
                name,
                ip_address: ipAddress,
                ae_title: aeTitle,
                port: modality.port,
                worklist_ip_address: worklistIp,
                worklist_ae_title: worklistAeTitle,
                worklist_port: modality.worklist_port,
                modality_type: modality.modality_type,
                brand_id: selectedBrandId,
                location_id: selectedLocationId,
                notes: modality.notes,
              });
            }
          } else {
            // Non-ultrasound: just clone normally
            modalitiesToInsert.push({
              clinic_id: newClinic.id,
              name: updateName(modality.name, siteName),
              ip_address: updateIpAddress(modality.ip_address, subnet),
              ae_title: modality.ae_title ? generateAeTitle(modality.ae_title, siteCode) : null,
              port: modality.port,
              worklist_ip_address: modality.worklist_ip_address ? updateIpAddress(modality.worklist_ip_address, subnet) : null,
              worklist_ae_title: modality.worklist_ae_title ? generateAeTitle(modality.worklist_ae_title, siteCode) : null,
              worklist_port: modality.worklist_port,
              modality_type: modality.modality_type,
              brand_id: selectedBrandId,
              location_id: selectedLocationId,
              notes: modality.notes,
            });
          }
        }

        if (modalitiesToInsert.length > 0) {
          const { error: modalitiesError } = await supabase
            .from('modalities')
            .insert(modalitiesToInsert);

          if (modalitiesError) throw modalitiesError;
        }
      }

      toast({
        title: 'Success',
        description: `Clinic "${siteName}" created with ${modalitiesByType.length} modality types cloned`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error cloning clinic:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clone clinic',
        variant: 'destructive',
      });
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Clone Clinic
          </DialogTitle>
          <DialogDescription>
            Clone "{sourceClinic?.location_name}" to create a new clinic with updated network settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Subnet */}
          <div className="space-y-2">
            <Label htmlFor="subnet">Subnet *</Label>
            <Input
              id="subnet"
              placeholder="e.g., 192.168.94 or just 94"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the third octet (e.g., "94") or full subnet (e.g., "192.168.94")
            </p>
          </div>

          {/* Site Name */}
          <div className="space-y-2">
            <Label htmlFor="siteName">Site Name *</Label>
            <Input
              id="siteName"
              placeholder="e.g., Victoria Point"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>

          {/* Site Code */}
          <div className="space-y-2">
            <Label htmlFor="siteCode">Site Code (3 letters) *</Label>
            <Input
              id="siteCode"
              placeholder="e.g., VIC"
              value={siteCode}
              onChange={(e) => setSiteCode(e.target.value.toUpperCase().slice(0, 3))}
              maxLength={3}
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Used for AE Title generation (e.g., VIC → VICCR, VICCRWL)
            </p>
          </div>

          {/* Company & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Select value={selectedBrandId} onValueChange={(value) => {
                setSelectedBrandId(value);
                setSelectedLocationId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location *</Label>
              <Select 
                value={selectedLocationId} 
                onValueChange={setSelectedLocationId}
                disabled={!selectedBrandId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Modality Types */}
          <div className="space-y-2">
            <Label>Modality Types to Clone *</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
              {MODALITY_TYPES.map(type => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`modality-${type.id}`}
                    checked={selectedModalityTypes.includes(type.id)}
                    onCheckedChange={() => handleModalityTypeToggle(type.id)}
                  />
                  <label
                    htmlFor={`modality-${type.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Ultrasound Quantity */}
          {selectedModalityTypes.includes('Ultrasound') && (
            <div className="space-y-2">
              <Label htmlFor="ultrasoundQty">Ultrasound Quantity</Label>
              <Input
                id="ultrasoundQty"
                type="number"
                min={1}
                max={10}
                value={ultrasoundQuantity}
                onChange={(e) => setUltrasoundQuantity(parseInt(e.target.value) || 1)}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Number of ultrasound units (IPs will auto-increment)
              </p>
            </div>
          )}

          {/* Preview */}
          {subnet && siteCode && (
            <div className="p-3 border rounded-lg bg-muted/30 space-y-1">
              <p className="text-sm font-medium">Preview</p>
              <p className="text-xs text-muted-foreground">
                Example IP: {updateIpAddress('192.168.93.30', subnet)}
              </p>
              <p className="text-xs text-muted-foreground">
                Example AE Title: {generateAeTitle('MOVCR', siteCode)} / {generateAeTitle('MOVCRWL', siteCode)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCloning}
            >
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={isCloning}>
              {isCloning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Clone Clinic
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
