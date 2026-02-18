import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface DirectoryFiltersProps {
  departments: string[];
  selectedDepartment: string;
  onDepartmentChange: (department: string) => void;
  sortBy: "name" | "department" | "position";
  onSortChange: (sort: "name" | "department" | "position") => void;
}

export function DirectoryFilters({
  departments,
  selectedDepartment,
  onDepartmentChange,
  sortBy,
  onSortChange,
}: DirectoryFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex-1 min-w-[200px]">
        <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Select value={sortBy} onValueChange={(v: any) => onSortChange(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="department">Sort by Department</SelectItem>
            <SelectItem value="position">Sort by Position</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedDepartment !== "all" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDepartmentChange("all")}
        >
          <X className="w-4 h-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
