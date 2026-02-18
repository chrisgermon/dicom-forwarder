import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface CpdBulkAttendanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CpdBulkAttendanceForm({
  open,
  onOpenChange,
  onSuccess,
}: CpdBulkAttendanceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCustom, setIsCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  const { data: users } = useQuery({
    queryKey: ["profiles-list-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
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

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const selectAllFiltered = () => {
    const idsToAdd = filteredUsers.map((u) => u.id);
    setSelectedUserIds((prev) => [...new Set([...prev, ...idsToAdd])]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUserIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const records = selectedUserIds.map((userId) => ({
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
      }));

      const { error } = await supabase.from("cpd_attendance").insert(records);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Attendance logged for ${selectedUserIds.length} user(s)`,
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
      setSelectedUserIds([]);
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Log CPD Attendance</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* User Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Users ({selectedUserIds.length} selected)</Label>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAllFiltered}>
                  {searchQuery ? "Add Filtered" : "Select All"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Selected Users Pills */}
            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1 bg-muted/30 rounded-md">
                {selectedUserIds.slice(0, 10).map((id) => {
                  const u = users?.find((u) => u.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                    >
                      {u?.full_name || u?.email?.split("@")[0]}
                      <button type="button" onClick={() => toggleUser(id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
                {selectedUserIds.length > 10 && (
                  <span className="text-xs text-muted-foreground px-2 py-0.5">
                    +{selectedUserIds.length - 10} more
                  </span>
                )}
              </div>
            )}

            <ScrollArea className="h-40 border rounded-md p-2">
              <div className="space-y-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users found
                  </p>
                ) : (
                  filteredUsers.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleUser(profile.id)}
                    >
                      <Checkbox
                        id={profile.id}
                        checked={selectedUserIds.includes(profile.id)}
                      />
                      <div className="text-sm cursor-pointer flex-1">
                        <span className="font-medium">{profile.full_name || "No name"}</span>
                        {profile.email && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            {profile.email}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="custom-entry-bulk"
              checked={isCustom}
              onCheckedChange={setIsCustom}
            />
            <Label htmlFor="custom-entry-bulk">Custom activity (not from meeting list)</Label>
          </div>

          {isCustom ? (
            <div className="space-y-2">
              <Label htmlFor="customMeetingNameBulk">Activity Name *</Label>
              <Input
                id="customMeetingNameBulk"
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
              <Label htmlFor="meetingBulk">Meeting *</Label>
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
            <Label htmlFor="categoryBulk">CPD Category</Label>
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
            <Label htmlFor="attendanceDateBulk">Date *</Label>
            <Input
              id="attendanceDateBulk"
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
              <Label htmlFor="durationHoursBulk">Duration (hrs) *</Label>
              <Input
                id="durationHoursBulk"
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
              <Label htmlFor="cpdHoursClaimedBulk">CPD Hours *</Label>
              <Input
                id="cpdHoursClaimedBulk"
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
            <Label htmlFor="organisationBulk">Organisation</Label>
            <Input
              id="organisationBulk"
              value={formData.organisation}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, organisation: e.target.value }))
              }
              placeholder="e.g., RANZCR, Hospital"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notesBulk">Notes</Label>
            <Textarea
              id="notesBulk"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || selectedUserIds.length === 0}>
              {submitting ? "Saving..." : `Save for ${selectedUserIds.length} User(s)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
