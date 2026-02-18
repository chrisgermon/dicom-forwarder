import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Calendar as CalendarIcon, Filter, X, ChevronRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { DateRange, Filters, FilterOptions } from "@/hooks/useExecutiveDashboard";

interface ExecutiveFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  filterOptions?: FilterOptions;
  isLoading?: boolean;
}

// Use current date for all presets
const getCurrentDate = () => new Date();

// Helper to get Australian Financial Year (July 1 - June 30)
function getFinancialYearRange(year: number): { startDate: string; endDate: string } {
  const fyStart = new Date(year, 6, 1); // July 1
  const fyEnd = new Date(year + 1, 5, 30); // June 30 next year
  return {
    startDate: format(fyStart, 'yyyy-MM-dd'),
    endDate: format(fyEnd, 'yyyy-MM-dd'),
  };
}

function getCurrentFinancialYear(): number {
  const now = getCurrentDate();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

const PRESET_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'this_fy', label: 'This Financial Year' },
  { value: 'last_fy', label: 'Last Financial Year' },
  { value: 'custom', label: 'Custom Range' },
];

function getPresetRange(preset: string): DateRange | null {
  const now = getCurrentDate();
  
  switch (preset) {
    case 'today':
      return { startDate: format(now, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return { startDate: format(yesterday, 'yyyy-MM-dd'), endDate: format(yesterday, 'yyyy-MM-dd') };
    }
    case 'last_7_days':
      return { startDate: format(subDays(now, 6), 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    case 'last_30_days':
      return { startDate: format(subDays(now, 29), 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    case 'this_month':
      return { startDate: format(startOfMonth(now), 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    case 'last_month':
      return { startDate: format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'), endDate: format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd') };
    case 'last_3_months':
      return { startDate: format(subMonths(now, 3), 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    case 'this_fy': {
      const fyYear = getCurrentFinancialYear();
      const fyStart = new Date(fyYear, 6, 1);
      return { startDate: format(fyStart, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    }
    case 'last_fy':
      return getFinancialYearRange(getCurrentFinancialYear() - 1);
    default:
      return null;
  }
}

function getPresetForRange(range: DateRange): string {
  for (const option of PRESET_OPTIONS) {
    if (option.value === 'custom') continue;
    const presetRange = getPresetRange(option.value);
    if (presetRange?.startDate === range.startDate && presetRange?.endDate === range.endDate) {
      return option.value;
    }
  }
  return 'custom';
}

export function ExecutiveFilters({
  dateRange,
  onDateRangeChange,
  filters,
  onFiltersChange,
  filterOptions
}: ExecutiveFiltersProps) {
  const initialPreset = getPresetForRange(dateRange);
  const [showCustom, setShowCustom] = useState(initialPreset === 'custom');
  const [currentPreset, setCurrentPreset] = useState<string>(initialPreset);
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date(dateRange.startDate));
  const [toDate, setToDate] = useState<Date | undefined>(new Date(dateRange.endDate));

  const handlePresetChange = (value: string) => {
    setCurrentPreset(value);
    
    if (value === 'custom') {
      setShowCustom(true);
      return;
    }
    
    setShowCustom(false);
    const range = getPresetRange(value);
    if (range) {
      setFromDate(new Date(range.startDate));
      setToDate(new Date(range.endDate));
      onDateRangeChange(range);
    }
  };

  const handleApplyCustomRange = (from?: Date, to?: Date) => {
    const dateFrom = from || fromDate;
    const dateTo = to || toDate;
    if (dateFrom && dateTo) {
      onDateRangeChange({
        startDate: format(dateFrom, 'yyyy-MM-dd'),
        endDate: format(dateTo, 'yyyy-MM-dd')
      });
    }
  };

  // Build mapping from display name to full worksite name
  const displayToFullName = new Map<string, string>();
  if (filterOptions?.worksites && filterOptions?.worksitesByBrand) {
    filterOptions.worksites.forEach(fullName => {
      const dashIndex = fullName.indexOf(' - ');
      if (dashIndex !== -1) {
        const shortName = fullName.substring(dashIndex + 3);
        displayToFullName.set(shortName, fullName);
      }
    });
  }

  const toggleFilter = (type: keyof Filters, value: string) => {
    // For worksites, convert display name to full name
    const actualValue = type === 'worksites' && displayToFullName.has(value)
      ? displayToFullName.get(value)!
      : value;

    const current = filters[type] || [];
    const updated = current.includes(actualValue)
      ? current.filter(v => v !== actualValue)
      : [...current, actualValue];
    onFiltersChange({ ...filters, [type]: updated.length > 0 ? updated : undefined });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = 
    (filters.worksites?.length || 0) + 
    (filters.radiologists?.length || 0) + 
    (filters.modalities?.length || 0);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Filters & Scope</CardTitle>
            <CardDescription>Refine the executive view by date, site, radiologist, or modality.</CardDescription>
          </div>
          {activeFilterCount > 0 && (
            <Badge variant="glass" className="px-3 py-1 text-xs">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
        {/* Date Range */}
        <div className="flex-1 min-w-[280px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date Range</label>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={currentPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full min-w-[180px] h-11 bg-background border-primary/20 hover:border-primary/40 transition-colors">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showCustom && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[140px] h-11 justify-start text-left font-normal border-primary/20 hover:border-primary/40 transition-colors',
                        !fromDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {fromDate ? format(fromDate, 'dd/MM/yyyy') : <span>From</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="bottom">
                    <CalendarComponent
                      mode="single"
                      selected={fromDate}
                      onSelect={(date) => {
                        setFromDate(date);
                        if (date && toDate) handleApplyCustomRange(date, toDate);
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[140px] h-11 justify-start text-left font-normal border-primary/20 hover:border-primary/40 transition-colors',
                        !toDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {toDate ? format(toDate, 'dd/MM/yyyy') : <span>To</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="bottom">
                    <CalendarComponent
                      mode="single"
                      selected={toDate}
                      onSelect={(date) => {
                        setToDate(date);
                        if (fromDate && date) handleApplyCustomRange(fromDate, date);
                      }}
                      className="pointer-events-auto"
                    />
                    </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        {/* Worksites Filter - Brand Hierarchy */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Worksites</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full h-11 justify-start bg-background border-primary/20 hover:border-primary/40 transition-colors"
              >
                <Building2 className="mr-2 h-4 w-4 text-primary" />
                {filters.worksites?.length 
                  ? `${filters.worksites.length} selected` 
                  : "All Worksites"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="start" side="bottom">
              <ScrollArea className="h-[350px] p-3">
                {filterOptions?.worksitesByBrand && Object.entries(filterOptions.worksitesByBrand)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([brand, sites]) => {
                    const sortedSites = [...sites].sort((a, b) => a.localeCompare(b));
                    // Convert display names to full names for comparison
                    const fullSiteNames = sortedSites.map(s => displayToFullName.get(s) || s);
                    const brandSitesSelected = fullSiteNames.filter(s => filters.worksites?.includes(s)).length;
                    const allSelected = brandSitesSelected === sortedSites.length;
                    const someSelected = brandSitesSelected > 0 && !allSelected;

                    const toggleBrand = () => {
                      if (allSelected) {
                        const updated = (filters.worksites || []).filter(ws => !fullSiteNames.includes(ws));
                        onFiltersChange({ ...filters, worksites: updated.length > 0 ? updated : undefined });
                      } else {
                        const current = filters.worksites || [];
                        const updated = [...new Set([...current, ...fullSiteNames])];
                        onFiltersChange({ ...filters, worksites: updated });
                      }
                    };

                    return (
                      <Collapsible key={brand} defaultOpen={someSelected || allSelected}>
                        <div className="flex items-center gap-2 py-1.5 hover:bg-muted/50 rounded-md px-1">
                          <Checkbox
                            id={`brand-${brand}`}
                            checked={allSelected}
                            className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                            onCheckedChange={toggleBrand}
                          />
                          <CollapsibleTrigger className="flex items-center gap-1 flex-1 text-sm font-medium cursor-pointer">
                            <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                            {brand}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {brandSitesSelected > 0 && `${brandSitesSelected}/`}{sortedSites.length}
                            </span>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <div className="ml-6 border-l border-border/50 pl-3 space-y-0.5">
                            {sortedSites.map(site => {
                              const fullName = displayToFullName.get(site) || site;
                              return (
                                <div key={site} className="flex items-center space-x-2 py-1">
                                  <Checkbox
                                    id={`ws-${site}`}
                                    checked={filters.worksites?.includes(fullName) || false}
                                    onCheckedChange={() => toggleFilter('worksites', site)}
                                  />
                                  <label htmlFor={`ws-${site}`} className="text-sm cursor-pointer flex-1 truncate">
                                    {site.replace(new RegExp(`^${brand}\\s*`, 'i'), '').replace(/^-\s*/, '') || site}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Radiologists Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Radiologists</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full h-11 justify-start bg-background border-primary/20 hover:border-primary/40 transition-colors"
              >
                <Filter className="mr-2 h-4 w-4 text-primary" />
                {filters.radiologists?.length 
                  ? `${filters.radiologists.length} selected` 
                  : "All Radiologists"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start" side="bottom">
              <ScrollArea className="h-[300px] p-3">
                {filterOptions?.radiologists.map(rad => (
                  <div key={rad} className="flex items-center space-x-2 py-1.5">
                    <Checkbox 
                      id={`rad-${rad}`}
                      checked={filters.radiologists?.includes(rad) || false}
                      onCheckedChange={() => toggleFilter('radiologists', rad)}
                    />
                    <label htmlFor={`rad-${rad}`} className="text-sm cursor-pointer flex-1 truncate">
                      {rad}
                    </label>
                  </div>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Modality Filter */}
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Modality</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full h-11 justify-start bg-background border-primary/20 hover:border-primary/40 transition-colors"
              >
                <Filter className="mr-2 h-4 w-4 text-primary" />
                {filters.modalities?.length 
                  ? `${filters.modalities.length} selected` 
                  : "All Modalities"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start" side="bottom">
              <ScrollArea className="h-auto max-h-[300px] p-3">
                {filterOptions?.modalities.map(mod => (
                  <div key={mod} className="flex items-center space-x-2 py-1.5">
                    <Checkbox 
                      id={`mod-${mod}`}
                      checked={filters.modalities?.includes(mod) || false}
                      onCheckedChange={() => toggleFilter('modalities', mod)}
                    />
                    <label htmlFor={`mod-${mod}`} className="text-sm cursor-pointer flex-1">
                      {mod}
                    </label>
                  </div>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <>
          <Separator className="bg-border/70" />
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {filters.worksites?.map(ws => {
              // Convert full name back to display name for badge
              const dashIndex = ws.indexOf(' - ');
              const displayName = dashIndex !== -1 ? ws.substring(dashIndex + 3) : ws;
              return (
                <Badge key={ws} variant="secondary" className="gap-1 text-xs">
                  {displayName}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      const current = filters.worksites || [];
                      const updated = current.filter(v => v !== ws);
                      onFiltersChange({ ...filters, worksites: updated.length > 0 ? updated : undefined });
                    }}
                  />
                </Badge>
              );
            })}
            {filters.radiologists?.map(rad => (
              <Badge key={rad} variant="secondary" className="gap-1 text-xs">
                {rad}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter('radiologists', rad)} />
              </Badge>
            ))}
            {filters.modalities?.map(mod => (
              <Badge key={mod} variant="secondary" className="gap-1 text-xs">
                {mod}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter('modalities', mod)} />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-6">
              Clear all
            </Button>
          </div>
        </>
      )}
      </CardContent>
    </Card>
  );
}
