import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface SheetData {
  name: string;
  data: any[][];
  locationId: string | null;
  modalities: { name: string; weeklyTarget: number }[];
}

interface BudgetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BudgetImportDialog({ open, onOpenChange, onSuccess }: BudgetImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing'>('upload');
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ['brands-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, display_name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch locations for selected brand
  const { data: locations } = useQuery({
    queryKey: ['locations-for-import', selectedBrandId],
    queryFn: async () => {
      if (!selectedBrandId) return [];
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('brand_id', selectedBrandId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBrandId,
  });

  // Fetch modality types
  const { data: modalityTypes } = useQuery({
    queryKey: ['modality-types-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modality_types')
        .select('id, key, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const parsedSheets: SheetData[] = workbook.SheetNames.map(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Try to extract modality targets from the data
        const modalities = extractModalityTargets(jsonData);
        
        return {
          name: sheetName,
          data: jsonData,
          locationId: null,
          modalities,
        };
      });

      setSheets(parsedSheets);
      setStep('map');
      toast.success(`Loaded ${parsedSheets.length} sheets from ${file.name}`);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error('Failed to parse Excel file');
    }
  };

  // Extract modality targets from sheet data
  const extractModalityTargets = (data: any[][]): { name: string; weeklyTarget: number }[] => {
    const modalities: { name: string; weeklyTarget: number }[] = [];
    
    // Look for modality names in first column and targets in subsequent columns
    for (const row of data) {
      if (!row || !row[0]) continue;
      
      const firstCell = String(row[0]).trim().toUpperCase();
      
      // Common modality names
      const modalityKeywords = ['X-RAY', 'XRAY', 'CT', 'MRI', 'ULTRASOUND', 'US', 'MAMMOGRAPHY', 'MAMMO', 'DEXA', 'DXA', 'FLUOROSCOPY', 'FLUORO', 'INTERVENTIONAL', 'OPG', 'NM'];
      
      for (const keyword of modalityKeywords) {
        if (firstCell.includes(keyword)) {
          // Sum numeric values in the row (weekly targets)
          const weeklySum = row.slice(1).reduce((sum: number, val: any) => {
            const num = parseFloat(val);
            return sum + (isNaN(num) ? 0 : num);
          }, 0);
          
          if (weeklySum > 0) {
            modalities.push({
              name: normalizeModalityName(firstCell),
              weeklyTarget: Math.round(weeklySum / 52), // Convert annual to weekly avg
            });
          }
          break;
        }
      }
    }
    
    return modalities;
  };

  const normalizeModalityName = (name: string): string => {
    const upper = name.toUpperCase();
    if (upper.includes('X-RAY') || upper.includes('XRAY')) return 'X-Ray';
    if (upper.includes('ULTRASOUND') || upper === 'US') return 'Ultrasound';
    if (upper.includes('MAMMOGRAPHY') || upper.includes('MAMMO')) return 'Mammography';
    if (upper.includes('FLUOROSCOPY') || upper.includes('FLUORO')) return 'Fluoroscopy';
    if (upper.includes('DEXA') || upper.includes('DXA')) return 'DEXA';
    if (upper.includes('INTERVENTIONAL')) return 'Interventional';
    if (upper === 'CT') return 'CT';
    if (upper === 'MRI') return 'MRI';
    if (upper === 'OPG') return 'OPG';
    if (upper === 'NM') return 'Nuclear Medicine';
    return name;
  };

  const handleLocationChange = (sheetIndex: number, locationId: string) => {
    setSheets(prev => prev.map((sheet, i) => 
      i === sheetIndex ? { ...sheet, locationId } : sheet
    ));
  };

  const mappedSheetsCount = sheets.filter(s => s.locationId).length;

  const handleImport = async () => {
    if (!modalityTypes) {
      toast.error('Modality types not loaded');
      return;
    }

    setIsImporting(true);
    setStep('importing');

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const sheet of sheets) {
        if (!sheet.locationId) continue;

        for (const modality of sheet.modalities) {
          // Find matching modality type
          const modalityType = modalityTypes.find(mt => 
            mt.name.toLowerCase() === modality.name.toLowerCase() ||
            mt.key.toLowerCase() === modality.name.toLowerCase()
          );

          if (!modalityType) {
            console.warn(`No modality type found for: ${modality.name}`);
            continue;
          }

          // Create weekly targets for the year
          const startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of current week

          // Create a single annual target entry
          const periodStart = new Date(2025, 0, 1).toISOString().split('T')[0];
          const periodEnd = new Date(2025, 11, 31).toISOString().split('T')[0];

          const { error } = await supabase
            .from('mlo_modality_targets')
            .upsert({
              location_id: sheet.locationId,
              modality_type_id: modalityType.id,
              target_period: 'weekly',
              period_start: periodStart,
              period_end: periodEnd,
              target_scans: modality.weeklyTarget,
              target_referrals: 0,
              user_id: (await supabase.auth.getUser()).data.user?.id,
            }, {
              onConflict: 'user_id,location_id,modality_type_id,target_period,period_start',
            });

          if (error) {
            console.error('Error inserting target:', error);
            errorCount++;
          } else {
            successCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} modality targets`);
        onSuccess();
        onOpenChange(false);
        resetDialog();
      }
      if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} targets`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setStep('upload');
    setSheets([]);
    setSelectedBrandId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetDialog(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Budget Targets
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file with weekly modality targets by clinic
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="excel-upload" className="cursor-pointer">
                <span className="text-primary font-medium">Click to upload</span>
                <span className="text-muted-foreground"> or drag and drop</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-2">Excel files (.xlsx, .xls)</p>
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Select Brand:</Label>
              <Select value={selectedBrandId || ''} onValueChange={setSelectedBrandId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Choose brand..." />
                </SelectTrigger>
                <SelectContent>
                  {brands?.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline">
                {mappedSheetsCount} / {sheets.length} mapped
              </Badge>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sheet Name</TableHead>
                    <TableHead>Detected Modalities</TableHead>
                    <TableHead>Map to Location</TableHead>
                    <TableHead className="w-[50px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheets.map((sheet, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{sheet.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {sheet.modalities.length > 0 ? (
                            sheet.modalities.map(m => (
                              <Badge key={m.name} variant="secondary" className="text-xs">
                                {m.name}: {m.weeklyTarget}/wk
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No targets detected</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={sheet.locationId || ''} 
                          onValueChange={(v) => handleLocationChange(index, v)}
                          disabled={!selectedBrandId}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select location..." />
                          </SelectTrigger>
                          <SelectContent>
                            {locations?.map(loc => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {sheet.locationId ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Importing targets...</p>
          </div>
        )}

        <DialogFooter>
          {step === 'map' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={mappedSheetsCount === 0 || isImporting}
              >
                Import {mappedSheetsCount} Clinics
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
