import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatAUDate } from "@/lib/dateUtils";
import * as XLSX from "xlsx";

interface ReminderReport {
  id: string;
  title: string;
  description: string | null;
  reminder_type: string;
  reminder_date: string;
  status: string;
  completed_at: string | null;
  email: string | null;
  phone_number: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  repeat_until_complete: boolean;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
}

export function ReminderReportExport({ onClose }: { onClose: () => void }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminder-report', statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('reminders')
        .select(`
          id,
          title,
          description,
          reminder_type,
          reminder_date,
          status,
          completed_at,
          email,
          phone_number,
          is_recurring,
          recurrence_pattern,
          repeat_until_complete,
          created_at,
          user_id
        `)
        .order('reminder_date', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('reminder_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately for owners
      const userIds = [...new Set(data?.map(r => r.user_id).filter(Boolean) || [])];
      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        profiles?.forEach(p => {
          profilesMap[p.id] = { full_name: p.full_name, email: p.email };
        });
      }

      return data?.map(r => ({
        ...r,
        owner_name: r.user_id ? profilesMap[r.user_id]?.full_name || null : null,
        owner_email: r.user_id ? profilesMap[r.user_id]?.email || null : null,
      })) as ReminderReport[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['reminder-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_categories')
        .select('name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const exportToExcel = () => {
    if (!reminders || reminders.length === 0) return;

    const exportData = reminders.map(r => ({
      'Title': r.title,
      'Description': r.description || '',
      'Type': r.reminder_type.replace('_', ' '),
      'Due Date': formatAUDate(r.reminder_date),
      'Status': r.status,
      'Completed Date': r.completed_at ? formatAUDate(r.completed_at) : '',
      'Owner Name': r.owner_name || '',
      'Owner Email': r.owner_email || '',
      'Notification Email': r.email || '',
      'Notification Phone': r.phone_number || '',
      'Recurring': r.is_recurring ? 'Yes' : 'No',
      'Recurrence Pattern': r.recurrence_pattern || '',
      'Repeat Until Complete': r.repeat_until_complete ? 'Yes' : 'No',
      'Created Date': formatAUDate(r.created_at),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reminders Report");

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `reminders_report_${today}.xlsx`);
  };

  const formatType = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Reminder Summary Report
            </CardTitle>
            <CardDescription>
              View and export reminders with due dates, owners, and completion status
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat.name} value={cat.name.toLowerCase().replace(/ /g, '_')}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={exportToExcel} disabled={!reminders?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {reminders?.length || 0} reminders found
        </div>

        <div className="max-h-[400px] overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !reminders?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No reminders found
                  </TableCell>
                </TableRow>
              ) : (
                reminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell className="font-medium">{reminder.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatType(reminder.reminder_type)}</Badge>
                    </TableCell>
                    <TableCell>{formatAUDate(reminder.reminder_date)}</TableCell>
                    <TableCell>
                      <Badge variant={reminder.status === 'completed' ? 'secondary' : 'default'}>
                        {reminder.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {reminder.owner_name || reminder.owner_email || '-'}
                    </TableCell>
                    <TableCell>
                      {reminder.completed_at ? formatAUDate(reminder.completed_at) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}