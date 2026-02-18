import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CpdUserSelectorProps {
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
}

export function CpdUserSelector({ selectedUserId, onUserChange }: CpdUserSelectorProps) {
  const { data: users, isLoading } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const handleChange = (value: string) => {
    if (value === "self") {
      onUserChange(null);
    } else {
      onUserChange(value);
    }
  };

  return (
    <div className="space-y-2">
      <Label>View CPD records for:</Label>
      <Select
        value={selectedUserId || "self"}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-full max-w-sm">
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="self">
            My Records
          </SelectItem>
          {!isLoading &&
            users?.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.full_name} ({profile.email})
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
