import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelImporterProps {
  onSuccess: () => void;
}

export function ExcelImporter({ onSuccess }: ExcelImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExcelFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!excelFile) {
      toast({
        title: 'Error',
        description: 'Please select an Excel file',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      // Parse Excel file
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      
      console.log(`Found ${workbook.SheetNames.length} sheets in Excel file`);
      
      // Process all sheets
      let totalSuccessCount = 0;
      const allErrors: string[] = [];
      
      for (const sheetName of workbook.SheetNames) {
        console.log(`Processing sheet: ${sheetName}`);
        
        const worksheet = workbook.Sheets[sheetName];
        const parsedText = XLSX.utils.sheet_to_txt(worksheet);
        
        // Skip empty sheets
        if (!parsedText.trim()) {
          console.log(`Skipping empty sheet: ${sheetName}`);
          continue;
        }
        
        try {
          // Call AI to parse and match for this sheet
          const { data: aiResult, error: aiError } = await supabase.functions.invoke('parse-modality-excel', {
            body: { parsedText }
          });

          if (aiError) {
            console.error(`Error processing sheet ${sheetName}:`, aiError);
            allErrors.push(`${sheetName}: ${aiError.message || 'Failed to parse'}`);
            continue;
          }

          if (!aiResult.sites || aiResult.sites.length === 0) {
            console.log(`No sites found in sheet: ${sheetName}`);
            continue;
          }

          // Import each site from this sheet
          for (const site of aiResult.sites) {
            try {
              await importSiteData(site);
              totalSuccessCount++;
              console.log(`Successfully imported ${site.location_name} from sheet ${sheetName}`);
            } catch (siteError: any) {
              allErrors.push(`${sheetName} - ${site.location_name}: ${siteError.message}`);
            }
          }
        } catch (sheetError: any) {
          console.error(`Error processing sheet ${sheetName}:`, sheetError);
          allErrors.push(`${sheetName}: ${sheetError.message}`);
        }
      }

      // Show results
      if (allErrors.length > 0) {
        console.error('Import errors:', allErrors);
        toast({
          title: totalSuccessCount > 0 ? 'Partial Success' : 'Import Failed',
          description: totalSuccessCount > 0
            ? `Imported ${totalSuccessCount} location${totalSuccessCount > 1 ? 's' : ''}, ${allErrors.length} failed. Check console for details.`
            : `Failed to import locations. Check console for details.`,
          variant: totalSuccessCount > 0 ? 'default' : 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: `Successfully imported ${totalSuccessCount} location${totalSuccessCount > 1 ? 's' : ''} from ${workbook.SheetNames.length} sheet${workbook.SheetNames.length > 1 ? 's' : ''}`,
        });
        setExcelFile(null);
        setIsOpen(false);
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to import Excel file',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const importSiteData = async (siteData: any) => {
    // Check if clinic exists
    const { data: existingClinic } = await supabase
      .from('clinics')
      .select('*')
      .eq('location_name', siteData.location_name)
      .maybeSingle();

    let clinicId = existingClinic?.id;

    // Create clinic if it doesn't exist
    if (!existingClinic) {
      const { data: newClinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          location_name: siteData.location_name,
          ip_range: siteData.ip_range || null,
          gateway: siteData.gateway || null,
        })
        .select()
        .single();

      if (clinicError) throw clinicError;
      clinicId = newClinic.id;
    }

    // Import servers
    if (siteData.servers && siteData.servers.length > 0) {
      for (const server of siteData.servers) {
        // Check if server exists
        const { data: existingServer } = await supabase
          .from('dicom_servers')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('ip_address', server.ip_address)
          .maybeSingle();

        if (!existingServer) {
          await supabase.from('dicom_servers').insert({
            clinic_id: clinicId,
            name: server.name,
            ip_address: server.ip_address,
            ae_title: server.ae_title || null,
            port: server.port || null,
            function: server.function || null,
          });
        }
      }
    }

    // Import modalities
    if (siteData.modalities && siteData.modalities.length > 0) {
      for (const modality of siteData.modalities) {
        // Check if modality exists
        const { data: existingModality } = await supabase
          .from('modalities')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('name', modality.name)
          .maybeSingle();

        if (!existingModality) {
          await supabase.from('modalities').insert({
            clinic_id: clinicId,
            brand_id: siteData.brand_id || null,
            location_id: siteData.location_id || null,
            name: modality.name,
            ip_address: modality.ip_address,
            ae_title: modality.ae_title || null,
            port: modality.port || null,
            worklist_ip_address: modality.worklist_ip_address || null,
            worklist_ae_title: modality.worklist_ae_title || null,
            worklist_port: modality.worklist_port || null,
            modality_type: modality.modality_type || null,
          });
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="w-4 h-4 mr-2" />
          Import Excel File
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import DICOM Configuration</DialogTitle>
          <DialogDescription>
            Upload your Excel file with DICOM modality information. AI will automatically match sites to existing brands and locations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="excel-file">Excel File</Label>
            <input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isImporting}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {excelFile && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {excelFile.name}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting || !excelFile}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
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
  );
}