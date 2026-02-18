import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
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

interface CpdAttendanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export function CpdAttendanceForm({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: CpdAttendanceFormProps) {
  const { user } = useAuth();
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

  const handleMeetingChange = (meetingId: string) => {
    setFormData((prev) => ({ ...prev, meetingId }));
    
    const meeting = meetings?.find((m) => m.id === meetingId);
    if (meeting) {
      setFormData((prev) => ({
        ...prev,
        meetingId,
        categoryId: meeting.category_id || prev.categoryId,
        durationHours: meeting.default_duration_hours?.toString() || prev.durationHours,
        cpdHoursClaimed: meeting.default_duration_hours?.toString() || prev.cpdHoursClaimed,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.from("cpd_attendance").insert({
        user_id: userId,
        meeting_id: isCustom ? null : formData.meetingId || null,
        custom_meeting_name: isCustom ? formData.customMeetingName : null,
        is_custom: isCustom,
        category_id: formData.categoryId || null,
        attendance_date: formData.attendanceDate,
        duration_hours: parseFloat(formData.durationHours) || 0,
        cpd_hours_claimed: parseFloat(formData.cpdHoursClaimed) || 0,
        organisation: formData.organisation || null,
        notes: formData.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attendance logged successfully",
      });

      setFormData({
        meetingId: "",
        customMeetingName: "",
        categoryId: "",
        attendanceDate: new Date().toISOString().split("T")[0],
        durationHours: "",
        cpdHoursClaimed: "",
        organisation: "",
        notes: "",
      });
      setIsCustom(false);
      onSuccess();
    } catch (error) {
      console.error("Error logging attendance:", error);
      toast({
        title: "Error",
        description: "Failed to log attendance",
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
          <DialogTitle>Log CPD Attendance</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="custom-entry"
              checked={isCustom}
              onCheckedChange={setIsCustom}
            />
            <Label htmlFor="custom-entry">Custom activity (not from meeting list)</Label>
          </div>

          {isCustom ? (
            <div className="space-y-2">
              <Label htmlFor="customMeetingName">Activity Name *</Label>
              <Input
                id="customMeetingName"
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
              <Label htmlFor="meeting">Meeting *</Label>
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
            <Label htmlFor="category">CPD Category</Label>
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
            <Label htmlFor="attendanceDate">Date *</Label>
            <Input
              id="attendanceDate"
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
              <Label htmlFor="durationHours">Duration (hrs) *</Label>
              <Input
                id="durationHours"
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
              <Label htmlFor="cpdHoursClaimed">CPD Hours *</Label>
              <Input
                id="cpdHoursClaimed"
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
            <Label htmlFor="organisation">Organisation</Label>
            <Input
              id="organisation"
              value={formData.organisation}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, organisation: e.target.value }))
              }
              placeholder="e.g., RANZCR, Hospital"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
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
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
