import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileDown, Users, Pencil, Trash2, List, Mail } from "lucide-react";
import { format } from "date-fns";
import { CpdAttendanceForm } from "./CpdAttendanceForm";
import { CpdAttendanceEditForm } from "./CpdAttendanceEditForm";
import { CpdAttendanceDeleteDialog } from "./CpdAttendanceDeleteDialog";
import { CpdExportDialog } from "./CpdExportDialog";
import { CpdEmailDialog } from "./CpdEmailDialog";
import { useRBACRole } from "@/hooks/useRBACRole";

interface CpdAttendanceRecord {
  id: string;
  user_id: string;
  meeting_id: string | null;
  custom_meeting_name: string | null;
  is_custom: boolean | null;
  category_id: string | null;
  attendance_date: string;
  duration_hours: number;
  cpd_hours_claimed: number;
  organisation: string | null;
  notes: string | null;
  category?: { name: string } | null;
  meeting?: { name: string } | null;
}

interface CpdAttendanceLogProps {
  userId: string | null;
}

export function CpdAttendanceLog({ userId }: CpdAttendanceLogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [editRecord, setEditRecord] = useState<CpdAttendanceRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<{ id: string; name: string } | null>(null);
  const { isSuperAdmin, isTenantAdmin } = useRBACRole();
  const canManageAll = isSuperAdmin || isTenantAdmin;

  const { data: attendanceRecords, isLoading, refetch } = useQuery({
    queryKey: ["cpd-attendance", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("cpd_attendance")
        .select(`
          *,
          category:cpd_categories(name),
          meeting:cpd_meetings(name)
        `)
        .eq("user_id", userId)
        .order("attendance_date", { ascending: false });

      if (error) throw error;
      return (data || []) as CpdAttendanceRecord[];
    },
    enabled: !!userId,
  });

  const canEditRecord = (record: CpdAttendanceRecord) => {
    // Admins can edit any record, users can only edit their own
    return canManageAll || record.user_id === user?.id;
  };

  const totalHours = attendanceRecords?.reduce((sum, record) => sum + record.cpd_hours_claimed, 0) || 0;

  if (!userId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Please log in to view your CPD attendance records.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">Total CPD Hours: {totalHours.toFixed(1)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowExport(true)}>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => setShowEmail(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Email Records
          </Button>
          {canManageAll && (
            <>
              <Button variant="outline" onClick={() => navigate("/cpd-all-records")}>
                <List className="h-4 w-4 mr-2" />
                View All
              </Button>
              <Button variant="outline" onClick={() => navigate("/cpd-bulk-add")}>
                <Users className="h-4 w-4 mr-2" />
                Bulk Add
              </Button>
            </>
          )}
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Attendance
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : attendanceRecords?.length === 0 ? (
            <p className="text-muted-foreground">No attendance records yet. Click "Log Attendance" to add your first entry.</p>
          ) : (
            <div className="space-y-3">
            {attendanceRecords?.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-2"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {record.is_custom ? record.custom_meeting_name : record.meeting?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(record.attendance_date), "dd MMM yyyy")}
                      {record.category?.name && ` • ${record.category.name}`}
                    </p>
                    {record.organisation && (
                      <p className="text-sm text-muted-foreground">
                        Organisation: {record.organisation}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">{record.cpd_hours_claimed} CPD hrs</p>
                      <p className="text-sm text-muted-foreground">
                        ({record.duration_hours} hrs attended)
                      </p>
                    </div>
                    {canEditRecord(record) && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditRecord(record)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteRecord({
                            id: record.id,
                            name: record.is_custom ? record.custom_meeting_name || "Custom Activity" : record.meeting?.name || "Meeting"
                          })}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CpdAttendanceForm
        open={showForm}
        onOpenChange={setShowForm}
        userId={userId}
        onSuccess={() => {
          setShowForm(false);
          refetch();
        }}
      />

      <CpdExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        userId={userId}
      />

      <CpdEmailDialog
        open={showEmail}
        onOpenChange={setShowEmail}
        userId={userId}
      />

      <CpdAttendanceEditForm
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        record={editRecord}
        onSuccess={() => {
          setEditRecord(null);
          refetch();
        }}
      />

      <CpdAttendanceDeleteDialog
        open={!!deleteRecord}
        onOpenChange={(open) => !open && setDeleteRecord(null)}
        recordId={deleteRecord?.id || null}
        recordName={deleteRecord?.name || ""}
        onSuccess={() => {
          setDeleteRecord(null);
          refetch();
        }}
      />
    </div>
  );
}
