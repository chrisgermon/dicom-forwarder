import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

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
}

interface CpdAttendanceEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: CpdAttendanceRecord | null;
  onSuccess: () => void;
}

export function CpdAttendanceEditForm({
  open,
  onOpenChange,
  record,
  onSuccess,
}: CpdAttendanceEditFormProps) {
  const { toast } = useToast();
  const [isCustom, setIsCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    meetingId: "",
    customMeetingName: "",
    categoryId: "",
    attendanceDate: new Date().toISOString().split("T")[0],
    durationHours: "",
    cpdHoursClaimed: "",
    organisation: "",
    notes: "",
  });

  const { data: meetings } = useQuery({
    queryKey: ["cpd-meetings-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cpd_meetings")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["cpd-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cpd_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Populate form when record changes
  useEffect(() => {
    if (record) {
      setIsCustom(record.is_custom || false);
      setFormData({
        meetingId: record.meeting_id || "",
        customMeetingName: record.custom_meeting_name || "",
        categoryId: record.category_id || "",
        attendanceDate: record.attendance_date,
        durationHours: record.duration_hours.toString(),
        cpdHoursClaimed: record.cpd_hours_claimed.toString(),
        organisation: record.organisation || "",
        notes: record.notes || "",
      });
    }
  }, [record]);

  const handleMeetingChange = (meetingId: string) => {
    setFormData((prev) => ({ ...prev, meetingId }));
    
    const meeting = meetings?.find((m) => m.id === meetingId);
    if (meeting) {
      setFormData((prev) => ({
        ...prev,
        meetingId,
        categoryId: meeting.category_id || prev.categoryId,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("cpd_attendance")
        .update({
          meeting_id: isCustom ? null : formData.meetingId || null,
          custom_meeting_name: isCustom ? formData.customMeetingName : null,
          is_custom: isCustom,
          category_id: formData.categoryId || null,
          attendance_date: formData.attendanceDate,
          duration_hours: parseFloat(formData.durationHours) || 0,
          cpd_hours_claimed: parseFloat(formData.cpdHoursClaimed) || 0,
          organisation: formData.organisation || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attendance updated successfully",
      });

      onSuccess();
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast({
        title: "Error",
        description: "Failed to update attendance",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit CPD Attendance</DialogTitle>
          <DialogDescription>
            Update the details of this attendance record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="custom-entry-edit"
              checked={isCustom}
              onCheckedChange={setIsCustom}
            />
            <Label htmlFor="custom-entry-edit">Custom activity (not from meeting list)</Label>
          </div>

          {isCustom ? (
            <div className="space-y-2">
              <Label htmlFor="customMeetingNameEdit">Activity Name *</Label>
              <Input
                id="customMeetingNameEdit"
                value={formData.customMeetingName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, customMeetingName: e.target.value }))
                }
                placeholder="Enter activity name"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="meetingEdit">Meeting *</Label>
              <Select value={formData.meetingId} onValueChange={handleMeetingChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a meeting" />
                </SelectTrigger>
                <SelectContent>
                  {meetings?.map((meeting) => (
                    <SelectItem key={meeting.id} value={meeting.id}>
                      {meeting.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="categoryEdit">CPD Category</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, categoryId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendanceDateEdit">Date *</Label>
            <Input
              id="attendanceDateEdit"
              type="date"
              value={formData.attendanceDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, attendanceDate: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="durationHoursEdit">Duration (hrs) *</Label>
              <Input
                id="durationHoursEdit"
                type="number"
                step="0.5"
                min="0"
                value={formData.durationHours}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, durationHours: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpdHoursClaimedEdit">CPD Hours *</Label>
              <Input
                id="cpdHoursClaimedEdit"
                type="number"
                step="0.5"
                min="0"
                value={formData.cpdHoursClaimed}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cpdHoursClaimed: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organisationEdit">Organisation</Label>
            <Input
              id="organisationEdit"
              value={formData.organisation}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, organisation: e.target.value }))
              }
              placeholder="e.g., RANZCR, Hospital"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notesEdit">Notes</Label>
            <Textarea
              id="notesEdit"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
