import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Filter, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

export interface FileFilters {
  fileType: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy: 'name' | 'date' | 'size';
  sortOrder: 'asc' | 'desc';
}

interface SharePointFiltersProps {
  filters: FileFilters;
  onFiltersChange: (filters: FileFilters) => void;
  fileTypes: string[];
}

export function SharePointFilters({ filters, onFiltersChange, fileTypes }: SharePointFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = filters.fileType !== 'all' || filters.dateFrom || filters.dateTo;

  const clearFilters = () => {
    onFiltersChange({
      fileType: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        Filters {hasActiveFilters && `(${hasActiveFilters})`}
      </Button>

      {showFilters && (
        <>
          {/* File Type Filter */}
          <Select
            value={filters.fileType}
            onValueChange={(value) => onFiltersChange({ ...filters, fileType: value })}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="File type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {fileTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, 'MMM d, yyyy') : 'From date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {filters.dateTo ? format(filters.dateTo, 'MMM d, yyyy') : 'To date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Sort By */}
          <Select
            value={filters.sortBy}
            onValueChange={(value: any) => onFiltersChange({ ...filters, sortBy: value })}
          >
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Select
            value={filters.sortOrder}
            onValueChange={(value: any) => onFiltersChange({ ...filters, sortOrder: value })}
          >
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </>
      )}
    </div>
  );
}
