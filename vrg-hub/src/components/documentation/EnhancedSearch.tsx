import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Search,
  Filter,
  X,
  Calendar as CalendarIcon,
  Save,
} from "lucide-react";
import { format } from "date-fns";

export interface SearchFilters {
  query: string;
  fileType: string;
  dateFrom?: Date;
  dateTo?: Date;
  modifiedBy?: string;
  sizeMin?: number;
  sizeMax?: number;
  department?: string;
  tags?: string[];
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  savedAt: string;
}

interface EnhancedSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  fileTypes: string[];
  departments?: string[];
  availableTags?: string[];
  savedSearches?: SavedSearch[];
  onSaveSearch?: (name: string, filters: SearchFilters) => void;
  onLoadSearch?: (search: SavedSearch) => void;
  onDeleteSearch?: (searchId: string) => void;
  isSearching?: boolean;
}

export function EnhancedSearch({
  filters,
  onFiltersChange,
  onSearch,
  fileTypes,
  departments = [],
  availableTags: _availableTags = [],
  savedSearches = [],
  onSaveSearch,
  onLoadSearch,
  onDeleteSearch,
  isSearching = false,
}: EnhancedSearchProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState("");

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      query: filters.query,
      fileType: "all",
    });
  };

  const handleSaveSearch = () => {
    if (searchName.trim() && onSaveSearch) {
      onSaveSearch(searchName, filters);
      setSearchName("");
      setShowSaveDialog(false);
    }
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'query' || key === 'fileType') return false;
    return value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  return (
    <div className="space-y-3">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search files and folders..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="pl-9 pr-4"
            disabled={isSearching}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={activeFilterCount > 0 ? "border-primary" : ""}
        >
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        <Button onClick={onSearch} disabled={isSearching}>
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground self-center">Quick:</span>
          {savedSearches.map((saved) => (
            <Badge
              key={saved.id}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 gap-1 pr-1"
            >
              <span onClick={() => onLoadSearch?.(saved)}>
                {saved.name}
              </span>
              {onDeleteSearch && (
                <X
                  className="h-3 w-3 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSearch(saved.id);
                  }}
                />
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* File Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">File Type</label>
                <Select
                  value={filters.fileType || "all"}
                  onValueChange={(value) => updateFilter('fileType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="folder">Folders only</SelectItem>
                    <SelectItem value="file">Files only</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="doc">Word Documents</SelectItem>
                    <SelectItem value="xls">Excel Spreadsheets</SelectItem>
                    <SelectItem value="ppt">PowerPoint</SelectItem>
                    <SelectItem value="jpg">Images</SelectItem>
                    {fileTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        .{type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
              {departments.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select
                    value={filters.department || "all"}
                    onValueChange={(value) => updateFilter('department', value === "all" ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Size Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">File Size</label>
                <Select
                  value={
                    filters.sizeMax === 1024 * 1024 ? "small" :
                    filters.sizeMax === 10 * 1024 * 1024 ? "medium" :
                    filters.sizeMin === 10 * 1024 * 1024 ? "large" :
                    "all"
                  }
                  onValueChange={(value) => {
                    if (value === "all") {
                      updateFilter('sizeMin', undefined);
                      updateFilter('sizeMax', undefined);
                    } else if (value === "small") {
                      updateFilter('sizeMin', undefined);
                      updateFilter('sizeMax', 1024 * 1024);
                    } else if (value === "medium") {
                      updateFilter('sizeMin', 1024 * 1024);
                      updateFilter('sizeMax', 10 * 1024 * 1024);
                    } else if (value === "large") {
                      updateFilter('sizeMin', 10 * 1024 * 1024);
                      updateFilter('sizeMax', undefined);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any size</SelectItem>
                    <SelectItem value="small">Small (&lt; 1 MB)</SelectItem>
                    <SelectItem value="medium">Medium (1-10 MB)</SelectItem>
                    <SelectItem value="large">Large (&gt; 10 MB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Modified After</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "PP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilter('dateFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Modified Before</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "PP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilter('dateTo', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
              <div className="flex gap-2">
                {onSaveSearch && (
                  <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <Save className="h-4 w-4 mr-2" />
                        Save Search
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-3">
                        <h4 className="font-semibold">Save Search</h4>
                        <Input
                          placeholder="Search name..."
                          value={searchName}
                          onChange={(e) => setSearchName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSaveDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSaveSearch}>
                            Save
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
