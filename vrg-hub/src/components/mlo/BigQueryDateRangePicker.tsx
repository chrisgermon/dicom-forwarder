import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, subWeeks, endOfWeek, startOfWeek, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { type DateRange } from '@/hooks/useMloBigQueryData';

interface BigQueryDateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

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
  const now = new Date();
  // If we're in July or later, FY started this calendar year
  // If we're before July, FY started last calendar year
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

// Helper to get calendar-based date ranges
function getCalendarRange(preset: string): { startDate: string; endDate: string } | null {
  const now = new Date();
  
  switch (preset) {
    case 'today': {
      return { startDate: format(now, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    }
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return { startDate: format(yesterday, 'yyyy-MM-dd'), endDate: format(yesterday, 'yyyy-MM-dd') };
    }
    case 'previous_week': {
      const lastWeek = subWeeks(now, 1);
      const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
      const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
      return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
    }
    case 'previous_7_days': {
      const start = subDays(now, 7);
      const end = subDays(now, 1);
      return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
    }
    case 'previous_30_days': {
      const start = subDays(now, 30);
      const end = subDays(now, 1);
      return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
    }
    case 'previous_month': {
      const lastMonth = subMonths(now, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
    }
    case 'previous_3_months': {
      const end = endOfMonth(subMonths(now, 1));
      const start = startOfMonth(subMonths(now, 3));
      return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
    }
    case 'previous_12_months': {
      const end = endOfMonth(subMonths(now, 1));
      const start = startOfMonth(subMonths(now, 12));
      return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
    }
    case 'this_financial_year': {
      const fyYear = getCurrentFinancialYear();
      const fyStart = new Date(fyYear, 6, 1);
      return { startDate: format(fyStart, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    }
    case 'last_financial_year': {
      const lastFyYear = getCurrentFinancialYear() - 1;
      return getFinancialYearRange(lastFyYear);
    }
    default:
      return null;
  }
}

const PRESET_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'previous_week', label: 'Previous week' },
  { value: 'previous_7_days', label: 'Previous 7 days' },
  { value: 'previous_30_days', label: 'Previous 30 days' },
  { value: 'previous_month', label: 'Previous month' },
  { value: 'previous_3_months', label: 'Previous 3 months' },
  { value: 'previous_12_months', label: 'Previous 12 months' },
  { value: 'this_financial_year', label: 'This Financial Year' },
  { value: 'last_financial_year', label: 'Last Financial Year' },
  { value: 'custom', label: 'Custom range...' },
];

// Export the default preset value
export const DEFAULT_DATE_RANGE_PRESET = 'previous_month';

// Export helper to get the default date range
export function getDefaultDateRange(): DateRange {
  const range = getCalendarRange(DEFAULT_DATE_RANGE_PRESET);
  if (range) {
    return { days: 0, startDate: range.startDate, endDate: range.endDate };
  }
  return { days: 30 };
}

export const BigQueryDateRangePicker: React.FC<BigQueryDateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
}) => {
  const [showCustom, setShowCustom] = React.useState(false);
  const [currentPreset, setCurrentPreset] = React.useState<string>(DEFAULT_DATE_RANGE_PRESET);
  const [fromDate, setFromDate] = React.useState<Date | undefined>(
    dateRange.startDate ? new Date(dateRange.startDate) : undefined
  );
  const [toDate, setToDate] = React.useState<Date | undefined>(
    dateRange.endDate ? new Date(dateRange.endDate) : undefined
  );

  const handlePresetChange = (value: string) => {
    setCurrentPreset(value);
    
    if (value === 'custom') {
      setShowCustom(true);
      return;
    }
    
    setShowCustom(false);
    
    // Check if it's a calendar-based preset
    const calendarRange = getCalendarRange(value);
    if (calendarRange) {
      setFromDate(new Date(calendarRange.startDate));
      setToDate(new Date(calendarRange.endDate));
      onDateRangeChange({ days: 0, startDate: calendarRange.startDate, endDate: calendarRange.endDate });
    } else {
      // It's a rolling days preset
      setFromDate(undefined);
      setToDate(undefined);
      onDateRangeChange({ days: parseInt(value) });
    }
  };

  const handleApplyCustomRange = () => {
    if (fromDate && toDate) {
      onDateRangeChange({
        days: 0,
        startDate: format(fromDate, 'yyyy-MM-dd'),
        endDate: format(toDate, 'yyyy-MM-dd'),
      });
    }
  };

  const getCurrentPresetValue = () => {
    return currentPreset;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={getCurrentPresetValue()} onValueChange={handlePresetChange}>
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
                {fromDate ? format(fromDate, 'dd/MM/yyyy') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
                initialFocus
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
                {toDate ? format(toDate, 'dd/MM/yyyy') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={setToDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button 
            onClick={handleApplyCustomRange}
            disabled={!fromDate || !toDate}
            className="h-11"
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
};
