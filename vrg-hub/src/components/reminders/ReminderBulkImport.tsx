import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { parse, isValid, format } from "date-fns";

interface ImportRow {
  title: string;
  description?: string;
  reminder_type: string;
  reminder_date: string;
  email?: string;
  phone_number?: string;
  cc_emails?: string;
  advance_notice_days?: string;
  repeat_until_complete?: string;
  is_recurring?: string;
  recurrence_pattern?: string;
  recurrence_interval?: string;
  valid: boolean;
  errors: string[];
}

// Parse flexible date formats including Excel serial numbers
const parseFlexibleDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  
  // Handle Excel serial number (number type or numeric string like "46051")
  const numericValue = typeof dateValue === 'number' ? dateValue : 
    (typeof dateValue === 'string' && /^\d+$/.test(dateValue.trim()) ? parseInt(dateValue.trim(), 10) : null);
  
  if (numericValue !== null && numericValue > 30000 && numericValue < 100000) {
    // Excel serial date: days since 1900-01-01 (with Excel's leap year bug)
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const result = new Date(excelEpoch.getTime() + numericValue * 24 * 60 * 60 * 1000);
    if (isValid(result)) return result;
  }
  
  const trimmed = dateValue.toString().trim();
  
  // Try Australian format (dd/MM/yyyy)
  let parsed = parse(trimmed, 'd/M/yyyy', new Date());
  if (isValid(parsed)) return parsed;
  
  parsed = parse(trimmed, 'dd/MM/yyyy', new Date());
  if (isValid(parsed)) return parsed;
  
  // Try with dashes (dd-MM-yyyy)
  parsed = parse(trimmed, 'd-M-yyyy', new Date());
  if (isValid(parsed)) return parsed;
  
  parsed = parse(trimmed, 'dd-MM-yyyy', new Date());
  if (isValid(parsed)) return parsed;
  
  // Try ISO format (yyyy-MM-dd)
  parsed = parse(trimmed, 'yyyy-MM-dd', new Date());
  if (isValid(parsed)) return parsed;
  
  // Try US format (MM/dd/yyyy) as fallback
  parsed = parse(trimmed, 'M/d/yyyy', new Date());
  if (isValid(parsed)) return parsed;
  
  // Try parsing as native Date string
  const nativeDate = new Date(trimmed);
  if (isValid(nativeDate) && !isNaN(nativeDate.getTime())) return nativeDate;
  
  return null;
};

export function ReminderBulkImport({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [_isUploading, setIsUploading] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'importing' | 'complete'>('idle');

  const downloadTemplate = () => {
    const template = [
      {
        title: "Example Lease Renewal",
        description: "Office lease for Level 5",
        reminder_type: "Lease Renewal",
        reminder_date: "15/06/2025",
        email: "user@example.com",
        phone_number: "+61400000000",
        cc_emails: "manager@example.com, team@example.com",
        advance_notice_days: "180,90,30,7",
        repeat_until_complete: "yes",
        is_recurring: "no",
        recurrence_pattern: "",
        recurrence_interval: "",
      },
      {
        title: "Equipment Service Due",
        description: "MRI Machine annual service",
        reminder_type: "Equipment Service",
        reminder_date: "01/03/2025",
        email: "",
        phone_number: "",
        cc_emails: "",
        advance_notice_days: "30,14,7,1",
        repeat_until_complete: "yes",
        is_recurring: "yes",
        recurrence_pattern: "yearly",
        recurrence_interval: "1",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reminders");
    XLSX.writeFile(wb, "reminder_import_template.xlsx");
  };

  const parseFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

      const validTypes = [
        'Certification', 'Contract', 'Event', 'General', 'License Expiration', 
        'Subscription', 'Lease Renewal', 'Accreditation Renewal', 'Equipment Service',
        'Insurance Renewal', 'Registration Renewal'
      ];

      const parsed: ImportRow[] = jsonData.map((row) => {
        const errors: string[] = [];
        
        // Validate required fields
        if (!row.title?.toString().trim()) {
          errors.push("Title is required");
        }
        if (!row.reminder_type?.toString().trim()) {
          errors.push("Reminder type is required");
        } else if (!validTypes.some(t => t.toLowerCase() === row.reminder_type.toString().toLowerCase())) {
          errors.push(`Invalid type. Valid: ${validTypes.join(', ')}`);
        }
        
        // Parse date with Australian format support
        const dateValue = row.reminder_date?.toString() || '';
        const parsedDate = parseFlexibleDate(dateValue);
        if (!row.reminder_date) {
          errors.push("Reminder date is required");
        } else if (!parsedDate) {
          errors.push("Invalid date format (use dd/MM/yyyy)");
        }

        return {
          title: row.title?.toString() || '',
          description: row.description?.toString() || '',
          reminder_type: row.reminder_type?.toString() || '',
          reminder_date: parsedDate ? format(parsedDate, 'yyyy-MM-dd') : dateValue,
          email: row.email?.toString() || '',
          phone_number: row.phone_number?.toString() || '',
          cc_emails: row.cc_emails?.toString() || '',
          advance_notice_days: row.advance_notice_days?.toString() || '7,3,1',
          repeat_until_complete: row.repeat_until_complete?.toString() || 'no',
          is_recurring: row.is_recurring?.toString() || 'no',
          recurrence_pattern: row.recurrence_pattern?.toString() || '',
          recurrence_interval: row.recurrence_interval?.toString() || '1',
          valid: errors.length === 0,
          errors,
        };
      });

      setParsedData(parsed);
      setImportStatus('preview');
    } catch (error: any) {
      toast.error("Failed to parse file: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const normalizeType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'certification': 'certification',
      'contract': 'contract',
      'event': 'event',
      'general': 'general',
      'license expiration': 'license_expiration',
      'subscription': 'subscription',
      'lease renewal': 'lease_renewal',
      'accreditation renewal': 'accreditation_renewal',
      'equipment service': 'equipment_service',
      'insurance renewal': 'insurance_renewal',
      'registration renewal': 'registration_renewal',
    };
    return typeMap[type.toLowerCase()] || 'general';
  };

  const importReminders = async () => {
    if (!user) {
      toast.error("You must be logged in to import reminders");
      return;
    }

    const validRows = parsedData.filter(row => row.valid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setImportStatus('importing');

    try {
      const reminders = validRows.map(row => {
        const advanceNoticeDays = row.advance_notice_days
          ? row.advance_notice_days.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
          : [7, 3, 1];

        // Parse cc_emails from comma-separated string
        const ccEmails = row.cc_emails
          ? row.cc_emails.split(',').map(e => e.trim()).filter(e => e.length > 0)
          : null;

        return {
          user_id: user.id,
          title: row.title,
          description: row.description || null,
          reminder_type: normalizeType(row.reminder_type),
          reminder_date: new Date(row.reminder_date).toISOString(),
          email: row.email || null,
          phone_number: row.phone_number || null,
          cc_emails: ccEmails,
          advance_notice_days: advanceNoticeDays,
          repeat_until_complete: row.repeat_until_complete?.toLowerCase() === 'yes',
          is_recurring: row.is_recurring?.toLowerCase() === 'yes',
          recurrence_pattern: row.recurrence_pattern || null,
          recurrence_interval: row.recurrence_interval ? parseInt(row.recurrence_interval) : 1,
          notification_channels: {
            email: !!row.email || (ccEmails && ccEmails.length > 0),
            sms: !!row.phone_number,
            in_app: true,
          },
          status: 'active',
          is_active: true,
        };
      });

      const { error } = await supabase.from('reminders').insert(reminders);

      if (error) throw error;

      toast.success(`Successfully imported ${reminders.length} reminders`);
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setImportStatus('complete');
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      toast.error("Failed to import reminders: " + error.message);
      setImportStatus('preview');
    }
  };

  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.filter(r => !r.valid).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Import Reminders
            </CardTitle>
            <CardDescription>
              Upload an Excel or CSV file to import multiple reminders at once
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {importStatus === 'idle' && (
          <>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Supports .xlsx, .xls, .csv files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Required columns:</strong> title, reminder_type, reminder_date (dd/MM/yyyy format)<br />
                <strong>Optional:</strong> description, email, phone_number, cc_emails (comma-separated), advance_notice_days, repeat_until_complete, is_recurring, recurrence_pattern, recurrence_interval
              </AlertDescription>
            </Alert>
          </>
        )}

        {importStatus === 'preview' && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {invalidCount} errors
                </Badge>
              )}
            </div>

            <div className="max-h-[400px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {row.valid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{row.title}</TableCell>
                      <TableCell>{row.reminder_type}</TableCell>
                      <TableCell>{row.reminder_date}</TableCell>
                      <TableCell className="text-sm text-destructive">
                        {row.errors.join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setParsedData([]);
                setImportStatus('idle');
              }}>
                Cancel
              </Button>
              <Button onClick={importReminders} disabled={validCount === 0}>
                Import {validCount} Reminders
              </Button>
            </div>
          </>
        )}

        {importStatus === 'importing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p>Importing reminders...</p>
          </div>
        )}

        {importStatus === 'complete' && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Import Complete!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}