import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
}

interface StaffAssignmentSelectProps {
  value?: string | null;
  onChange: (userId: string | null) => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "default";
  placeholder?: string;
}

export function StaffAssignmentSelect({
  value,
  onChange,
  disabled,
  size = "sm",
  placeholder = "Assign to...",
}: StaffAssignmentSelectProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("is_active", true)
          .order("full_name");
        setStaff(data || []);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const handleChange = async (newValue: string) => {
    if (disabled || isSaving) return;
    setIsSaving(true);
    try {
      await onChange(newValue === "unassign" ? null : newValue);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedStaff = staff.find((s) => s.id === value);

  return (
    <div className="flex items-center gap-1">
      <Select
        value={value || ""}
        onValueChange={handleChange}
        disabled={disabled || isSaving || isLoading}
      >
        <SelectTrigger className={size === "sm" ? "h-7 text-xs w-[140px]" : "h-9 w-[180px]"}>
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <SelectValue placeholder={placeholder}>
              {selectedStaff ? (
                <span className="truncate">{selectedStaff.full_name || selectedStaff.email}</span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  {placeholder}
                </span>
              )}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          {value && (
            <SelectItem value="unassign" className="text-muted-foreground">
              <span className="flex items-center gap-1">
                <X className="h-3 w-3" />
                Unassign
              </span>
            </SelectItem>
          )}
          {staff.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.full_name || member.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
