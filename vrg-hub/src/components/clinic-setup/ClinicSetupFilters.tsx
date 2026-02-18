import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import { ClinicSetupSection } from "@/hooks/useClinicSetupChecklists";

interface ClinicSetupFiltersProps {
  sections: ClinicSetupSection[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedOwner: string;
  onOwnerChange: (value: string) => void;
  selectedSection: string;
  onSectionChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
}

export function ClinicSetupFilters({
  sections,
  searchQuery,
  onSearchChange,
  selectedOwner,
  onOwnerChange,
  selectedSection,
  onSectionChange,
  statusFilter,
  onStatusChange,
  onClearFilters,
}: ClinicSetupFiltersProps) {
  // Get unique owners (prefer owner_profile name, fallback to section_owner text)
  const ownerMap = new Map<string, string>();
  sections.forEach(s => {
    const ownerId = s.section_owner_id || s.section_owner || null;
    const ownerName = s.owner_profile?.full_name || s.section_owner;
    if (ownerId && ownerName) {
      ownerMap.set(ownerId, ownerName);
    }
  });
  const owners = Array.from(ownerMap.entries()).map(([id, name]) => ({ id, name }));
  
  const hasActiveFilters = searchQuery || selectedOwner !== "all" || selectedSection !== "all" || statusFilter !== "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Section Filter */}
        <Select value={selectedSection} onValueChange={onSectionChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map(section => (
              <SelectItem key={section.id} value={section.id}>
                {section.section_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Owner Filter */}
        <Select value={selectedOwner} onValueChange={onOwnerChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map(owner => (
              <SelectItem key={owner.id} value={owner.id}>
                {owner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" /> Active filters:
          </span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchQuery}"
              <X className="h-3 w-3 cursor-pointer" onClick={() => onSearchChange("")} />
            </Badge>
          )}
          {selectedSection !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Section: {sections.find(s => s.id === selectedSection)?.section_name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onSectionChange("all")} />
            </Badge>
          )}
          {selectedOwner !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Owner: {owners.find(o => o.id === selectedOwner)?.name || selectedOwner}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onOwnerChange("all")} />
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onStatusChange("all")} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
