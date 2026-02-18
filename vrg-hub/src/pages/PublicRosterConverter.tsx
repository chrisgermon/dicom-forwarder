import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';
import { format, startOfWeek, addDays, isWithinInterval } from 'date-fns';
import { Upload, Download, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import visionLogo from '@/assets/vision-radiology-logo.png';
interface RosterEntry {
  staffName: string;
  clinic: string;
  instanceType: string;
  role: string;
  startDate: Date;
  startTime: string;
  endTime: string;
  status: string;
  leaveType: string;
  dayOfWeek: number;
}

interface ParsedCSV {
  entries: RosterEntry[];
  weeks: Date[];
  clinics: string[];
}

interface CellStyle {
  v: string;
  s?: {
    fill?: { fgColor?: { rgb: string } };
    font?: { bold?: boolean; color?: { rgb: string }; sz?: number; name?: string };
    alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean };
    border?: {
      top?: { style: string; color: { rgb: string } };
      bottom?: { style: string; color: { rgb: string } };
      left?: { style: string; color: { rgb: string } };
      right?: { style: string; color: { rgb: string } };
    };
  };
}

const parseTime = (dateTimeStr: string): string => {
  if (!dateTimeStr) return '';
  try {
    const dt = new Date(dateTimeStr);
    let hour = dt.getHours();
    const minute = dt.getMinutes();
    const amPm = hour < 12 ? 'am' : 'pm';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute.toString().padStart(2, '0')}${amPm}`;
  } catch {
    return '';
  }
};

const timeSortKey = (timeStr: string): number => {
  if (!timeStr) return 999;
  try {
    const lower = timeStr.toLowerCase();
    const isPm = lower.includes('pm');
    const cleaned = lower.replace('am', '').replace('pm', '');
    const [hourStr, minStr] = cleaned.split(':');
    let hour = parseInt(hourStr);
    const minute = parseInt(minStr || '0');
    if (isPm && hour !== 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return hour * 60 + minute;
  } catch {
    return 999;
  }
};

const normalizeRole = (role: string): string => {
  const r = role.toLowerCase().trim();
  if (r.includes('radiographers')) return 'Radiographer';
  if (r.includes('sonographers')) return 'Sonographer';
  if (r.includes('medical receptionist')) return 'Medical Receptionist';
  if (r.includes('mri radiographer')) return 'Medical Imaging Technologist / MRI Technologist';
  if (r.includes('mri technologist')) return 'MRI Technologist';
  if (r.includes('clinic admin')) return 'Administration Assistance';
  if (r.includes('nurse')) return 'Nurse';
  if (r.includes('radiologists')) return 'Radiologist';
  if (r.includes('no role')) return 'Leave';
  return role;
};

const getRoleOrder = (): string[] => [
  'Medical Receptionist',
  'Radiographer',
  'Medical Imaging Technologist',
  'Medical Imaging Technologist / MRI Technologist',
  'MRI Technologist',
  'Nurse',
  'Sonographer',
  'Administration Assistance',
  'Radiologist',
  'Leave'
];

const normalizeLeaveType = (leaveType: string): string => {
  const map: Record<string, string> = {
    "Personal (Sick/Carer's) Leave": "Personal/carer's leave",
    "Annual Leave": "Annual leave",
    "Other Unpaid Leave": "Other unpaid leave",
    "Compassionate and Bereavement Leave": "Personal/carer's leave",
  };
  return map[leaveType] || leaveType;
};

const parseCSV = (csvContent: string): ParsedCSV => {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const entries: RosterEntry[] = [];
  const weeksSet = new Set<string>();
  const clinicsSet = new Set<string>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const getVal = (header: string) => {
      const idx = headers.indexOf(header);
      return idx >= 0 ? values[idx] || '' : '';
    };
    
    const startDateStr = getVal('Start date');
    if (!startDateStr) continue;
    
    const startDate = new Date(startDateStr);
    const dayOfWeek = startDate.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const clinic = getVal('Clinic');
    if (clinic) clinicsSet.add(clinic);
    
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
    weeksSet.add(weekStart.toISOString());
    
    const status = getVal('Status');
    if (!['Published', 'Approved'].includes(status)) continue;
    
    entries.push({
      staffName: getVal('Staff full name'),
      clinic,
      instanceType: getVal('Instance type'),
      role: getVal('Role'),
      startDate,
      startTime: parseTime(getVal('Start time')),
      endTime: parseTime(getVal('End time')),
      status,
      leaveType: getVal('Leave type'),
      dayOfWeek: adjustedDay
    });
  }
  
  const weeks = Array.from(weeksSet)
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());
  
  const clinics = Array.from(clinicsSet).sort();
  
  return { entries, weeks, clinics };
};

const borderStyle = {
  top: { style: 'thin', color: { rgb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
  left: { style: 'thin', color: { rgb: 'CCCCCC' } },
  right: { style: 'thin', color: { rgb: 'CCCCCC' } },
};

const createHeaderCell = (value: string): CellStyle => ({
  v: value,
  s: {
    fill: { fgColor: { rgb: '1F4E79' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: borderStyle,
  },
});

const createDateHeaderCell = (value: string): CellStyle => ({
  v: value,
  s: {
    fill: { fgColor: { rgb: 'D9D9D9' } },
    font: { bold: true, color: { rgb: '000000' }, sz: 11, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderStyle,
  },
});

const createClinicCell = (value: string): CellStyle => ({
  v: value,
  s: {
    fill: { fgColor: { rgb: 'FFFF00' } },
    font: { bold: true, color: { rgb: '000000' }, sz: 11, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: borderStyle,
  },
});

const createRoleCell = (value: string): CellStyle => ({
  v: value,
  s: {
    fill: { fgColor: { rgb: 'FFFFFF' } },
    font: { bold: true, color: { rgb: '000000' }, sz: 10, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: borderStyle,
  },
});

const createEmptyCell = (): CellStyle => ({
  v: '',
  s: {
    fill: { fgColor: { rgb: 'F5F5F5' } },
    font: { color: { rgb: '000000' }, sz: 10, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: borderStyle,
  },
});

const createLeaveCell = (value: string): CellStyle => ({
  v: value,
  s: {
    fill: { fgColor: { rgb: value ? 'FFF2CC' : 'F5F5F5' } },
    font: { color: { rgb: '000000' }, sz: 10, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: borderStyle,
  },
});

const createRichShiftCell = (entries: { time: string; name: string; timeRange: string }[]): CellStyle => {
  if (entries.length === 0) {
    return createEmptyCell();
  }
  
  const formattedText = entries.map(e => `${e.timeRange}\n${e.name}`).join('\n\n');
  
  return {
    v: formattedText,
    s: {
      fill: { fgColor: { rgb: 'C6EFCE' } },
      font: { color: { rgb: '006100' }, sz: 10, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: {
        top: { style: 'medium', color: { rgb: '70AD47' } },
        bottom: { style: 'medium', color: { rgb: '70AD47' } },
        left: { style: 'medium', color: { rgb: '70AD47' } },
        right: { style: 'medium', color: { rgb: '70AD47' } },
      },
    },
  };
};

const generateXLSX = (entries: RosterEntry[], weekStart: Date): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  const wsData: CellStyle[][] = [];
  
  const weekDates: Date[] = [];
  for (let i = 0; i < 6; i++) {
    weekDates.push(addDays(weekStart, i));
  }
  const weekEnd = addDays(weekStart, 6);
  
  const weekEntries = entries.filter(e => 
    isWithinInterval(e.startDate, { start: weekStart, end: weekEnd })
  );
  
  const headerRow: CellStyle[] = [
    createHeaderCell('VISION Radiology'),
    createHeaderCell(''),
    createHeaderCell(''),
    createHeaderCell(''),
    createHeaderCell(''),
    createHeaderCell(''),
    createHeaderCell(''),
  ];
  wsData.push(headerRow);
  
  const dateRange = `${format(weekDates[0], 'dd/MM/yyyy')} - ${format(weekDates[5], 'dd/MM/yyyy')}`;
  const dateRow: CellStyle[] = [
    createDateHeaderCell(dateRange),
    ...weekDates.map(d => createDateHeaderCell(format(d, 'dd/MM/yyyy'))),
  ];
  wsData.push(dateRow);
  
  const clinics = [...new Set(weekEntries.map(e => e.clinic))].filter(Boolean).sort();
  
  for (const clinic of clinics) {
    const clinicEntries = weekEntries.filter(e => e.clinic === clinic);
    
    const clinicRow: CellStyle[] = [
      createClinicCell(clinic),
      createClinicCell(''),
      createClinicCell(''),
      createClinicCell(''),
      createClinicCell(''),
      createClinicCell(''),
      createClinicCell(''),
    ];
    wsData.push(clinicRow);
    
    const shifts = clinicEntries.filter(e => e.instanceType === 'Shift');
    const leaves = clinicEntries.filter(e => e.instanceType === 'Leave');
    
    const rolesInClinic = [...new Set(shifts.map(e => normalizeRole(e.role)))];
    const roleOrder = getRoleOrder();
    const sortedRoles = rolesInClinic
      .filter(r => r !== 'Leave')
      .sort((a, b) => {
        const aIdx = roleOrder.indexOf(a);
        const bIdx = roleOrder.indexOf(b);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      });
    
    for (const role of sortedRoles) {
      const roleShifts = shifts.filter(e => normalizeRole(e.role) === role);
      
      const dayEntries: { time: string; name: string; timeRange: string }[][] = [[], [], [], [], [], []];
      
      for (const shift of roleShifts) {
        if (shift.dayOfWeek >= 0 && shift.dayOfWeek < 6) {
          dayEntries[shift.dayOfWeek].push({
            time: shift.startTime,
            name: shift.staffName,
            timeRange: `${shift.startTime} - ${shift.endTime}`
          });
        }
      }
      
      for (const day of dayEntries) {
        day.sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time));
      }
      
      const row: CellStyle[] = [createRoleCell(role)];
      for (let d = 0; d < 6; d++) {
        row.push(createRichShiftCell(dayEntries[d]));
      }
      wsData.push(row);
    }
    
    if (leaves.length > 0) {
      const dayLeave: string[][] = [[], [], [], [], [], []];
      
      for (const leave of leaves) {
        if (leave.dayOfWeek >= 0 && leave.dayOfWeek < 6) {
          const leaveType = normalizeLeaveType(leave.leaveType) || 'Leave';
          dayLeave[leave.dayOfWeek].push(`${leaveType}\n${leave.staffName}`);
        }
      }
      
      const hasLeave = dayLeave.some(d => d.length > 0);
      if (hasLeave) {
        const row: CellStyle[] = [createLeaveCell('Leave')];
        for (let d = 0; d < 6; d++) {
          row.push(createLeaveCell(dayLeave[d].join('\n\n')));
        }
        wsData.push(row);
      }
    }
  }
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  ws['!cols'] = [
    { wch: 28 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
  ];
  
  const rowHeights: { hpt: number }[] = [];
  for (let i = 0; i < wsData.length; i++) {
    if (i === 0) {
      rowHeights.push({ hpt: 32 });
    } else if (i === 1) {
      rowHeights.push({ hpt: 24 });
    } else {
      const rowData = wsData[i];
      const maxEntries = Math.max(...rowData.map(cell => {
        if (!cell.v) return 0;
        return (cell.v.split('\n\n').length);
      }));
      const height = Math.max(36, maxEntries * 40);
      rowHeights.push({ hpt: height });
    }
  }
  ws['!rows'] = rowHeights;
  
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Staff Roster');
  return wb;
};

type ExportFormat = 'xlsx' | 'pdf';

const generatePDF = (entries: RosterEntry[], weekStart: Date, logoDataUrl: string): jsPDF => {
  // A4 landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const margin = 10;
  const usableWidth = pageWidth - (margin * 2);

  const weekDates: Date[] = [];
  for (let i = 0; i < 6; i++) {
    weekDates.push(addDays(weekStart, i));
  }
  const weekEnd = addDays(weekStart, 6);

  const weekEntries = entries.filter(e =>
    isWithinInterval(e.startDate, { start: weekStart, end: weekEnd })
  );

  // Add logo
  try {
    doc.addImage(logoDataUrl, 'PNG', margin, 5, 50, 15);
  } catch (e) {
    // Fallback to text if logo fails
    doc.setFontSize(18);
    doc.setTextColor(31, 78, 121);
    doc.setFont('helvetica', 'bold');
    doc.text('VISION Radiology', margin, 15);
  }

  const dateRange = `${format(weekDates[0], 'dd/MM/yyyy')} - ${format(weekDates[5], 'dd/MM/yyyy')}`;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Staff Roster - Week: ${dateRange}`, margin + 55, 12);

  const clinics = [...new Set(weekEntries.map(e => e.clinic))].filter(Boolean).sort();

  const tableData: string[][] = [];
  const headers = ['Role', ...weekDates.map(d => format(d, 'EEE dd/MM'))];

  for (const clinic of clinics) {
    const clinicEntries = weekEntries.filter(e => e.clinic === clinic);

    // Add clinic header row
    tableData.push([clinic, '', '', '', '', '', '']);

    const shifts = clinicEntries.filter(e => e.instanceType === 'Shift');
    const leaves = clinicEntries.filter(e => e.instanceType === 'Leave');

    const rolesInClinic = [...new Set(shifts.map(e => normalizeRole(e.role)))];
    const roleOrder = getRoleOrder();
    const sortedRoles = rolesInClinic
      .filter(r => r !== 'Leave')
      .sort((a, b) => {
        const aIdx = roleOrder.indexOf(a);
        const bIdx = roleOrder.indexOf(b);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      });

    for (const role of sortedRoles) {
      const roleShifts = shifts.filter(e => normalizeRole(e.role) === role);

      const dayEntries: string[][] = [[], [], [], [], [], []];

      for (const shift of roleShifts) {
        if (shift.dayOfWeek >= 0 && shift.dayOfWeek < 6) {
          dayEntries[shift.dayOfWeek].push(`${shift.startTime}-${shift.endTime}\n${shift.staffName}`);
        }
      }

      const row: string[] = [role];
      for (let d = 0; d < 6; d++) {
        row.push(dayEntries[d].join('\n\n'));
      }
      tableData.push(row);
    }

    if (leaves.length > 0) {
      const dayLeave: string[][] = [[], [], [], [], [], []];

      for (const leave of leaves) {
        if (leave.dayOfWeek >= 0 && leave.dayOfWeek < 6) {
          const leaveType = normalizeLeaveType(leave.leaveType) || 'Leave';
          dayLeave[leave.dayOfWeek].push(`${leaveType}\n${leave.staffName}`);
        }
      }

      const hasLeave = dayLeave.some(d => d.length > 0);
      if (hasLeave) {
        const row: string[] = ['Leave'];
        for (let d = 0; d < 6; d++) {
          row.push(dayLeave[d].join('\n\n'));
        }
        tableData.push(row);
      }
    }
  }

  // Calculate column widths to fit page
  const roleColWidth = 32;
  const dayColWidth = (usableWidth - roleColWidth) / 6;

  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 22,
    margin: { left: margin, right: margin },
    tableWidth: usableWidth,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [31, 78, 121],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: roleColWidth },
      1: { cellWidth: dayColWidth },
      2: { cellWidth: dayColWidth },
      3: { cellWidth: dayColWidth },
      4: { cellWidth: dayColWidth },
      5: { cellWidth: dayColWidth },
      6: { cellWidth: dayColWidth },
    },
    didParseCell: (data) => {
      // Style clinic rows
      if (data.section === 'body' && data.column.index === 0) {
        const cellText = String(data.cell.raw || '');
        const roleOrder = getRoleOrder();
        const isRole = roleOrder.includes(cellText) || cellText === 'Leave';
        if (!isRole && cellText && cellText.length > 0) {
          const clinicsList = [...new Set(entries.map(e => e.clinic))].filter(Boolean);
          if (clinicsList.includes(cellText)) {
            data.cell.styles.fillColor = [255, 255, 0];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });

  return doc;
};

export default function PublicRosterConverter() {
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseCSV(content);
        setCsvData(parsed);
        if (parsed.weeks.length > 0) {
          setSelectedWeek(parsed.weeks[0]);
        }
      } catch (err) {
        setError('Failed to parse CSV file. Please check the format.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setIsLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const handleConvert = useCallback(() => {
    if (!csvData || !selectedWeek) return;

    setIsLoading(true);
    try {
      const weekStr = format(selectedWeek, 'dd_MMM_yyyy');

      if (exportFormat === 'xlsx') {
        const wb = generateXLSX(csvData.entries, selectedWeek);
        XLSX.writeFile(wb, `STAFF_ROSTER_Week_${weekStr}.xlsx`);
      } else {
        const doc = generatePDF(csvData.entries, selectedWeek, visionLogo);
        doc.save(`STAFF_ROSTER_Week_${weekStr}.pdf`);
      }
    } catch (err) {
      setError(`Failed to generate ${exportFormat.toUpperCase()} file.`);
    } finally {
      setIsLoading(false);
    }
  }, [csvData, selectedWeek, exportFormat]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      const input = document.getElementById('public-roster-file-input') as HTMLInputElement;
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <img 
            src={visionLogo} 
            alt="Vision Radiology" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-slate-800">Staff Roster Converter</h1>
          <p className="text-slate-500 mt-1">Convert Optiq CSV to Formatted Excel Rosters</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-8 space-y-6">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-green-500 hover:bg-green-50/50 transition-all cursor-pointer"
              onClick={() => document.getElementById('public-roster-file-input')?.click()}
            >
              <input
                id="public-roster-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="text-slate-500">
                <Upload className="mx-auto h-12 w-12 mb-4 text-slate-400" />
                <p className="text-lg font-medium text-slate-700">
                  {fileName || 'Drop CSV file here or click to browse'}
                </p>
                <p className="text-sm mt-1">Supports Optiq CSV roster export format</p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {csvData && (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">File Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Total Entries:</span>
                      <span className="ml-2 font-medium text-slate-800">{csvData.entries.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Clinics:</span>
                      <span className="ml-2 font-medium text-slate-800">{csvData.clinics.length}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Select Week
                  </label>
                  <Select
                    value={selectedWeek?.toISOString() || ''}
                    onValueChange={(value) => setSelectedWeek(new Date(value))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select a week" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvData.weeks.map((week) => (
                        <SelectItem key={week.toISOString()} value={week.toISOString()}>
                          Week of {format(week, 'dd MMM yyyy')} - {format(addDays(week, 5), 'dd MMM yyyy')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">
                    Export Format
                  </label>
                  <RadioGroup
                    value={exportFormat}
                    onValueChange={(value) => setExportFormat(value as ExportFormat)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="xlsx" id="xlsx" />
                      <Label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer">
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        Excel (XLSX)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pdf" id="pdf" />
                      <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="h-4 w-4 text-red-600" />
                        PDF (A4 Landscape)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button
                  onClick={handleConvert}
                  disabled={isLoading || !selectedWeek}
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Download {exportFormat === 'xlsx' ? 'Excel' : 'PDF'} Roster
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-400 mt-6">
          Vision Radiology Staff Roster Generator
        </p>
      </div>
    </div>
  );
}
