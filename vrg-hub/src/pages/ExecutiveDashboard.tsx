import { useState, useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInDays, subDays } from "date-fns";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExecutiveFilters } from "@/components/executive/ExecutiveFilters";
import { ExecutiveKPIs } from "@/components/executive/ExecutiveKPIs";
import { ExecutiveCharts } from "@/components/executive/ExecutiveCharts";
import { ExecutiveHierarchy } from "@/components/executive/ExecutiveHierarchy";
// import { ExecutiveSearchBox } from "@/components/executive/ExecutiveSearchBox";
// import { supabase } from "@/integrations/supabase/client";
import {
  useFilterOptions,
  useKPIs,
  useWorksiteHierarchy,
  useRadiologistHierarchy,
  useRevenueTrend,
  useRevenueByModality,
  useTopRadiologists,
  useTopWorksites,
  useDataFreshness,
  type DateRange,
  type Filters
} from "@/hooks/useExecutiveDashboard";

// Default to previous month
function getDefaultDateRange(): DateRange {
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  return {
    startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
  };
}

export default function ExecutiveDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [filters, setFilters] = useState<Filters>({});

  // Calculate previous period for comparison
  const previousDateRange = useMemo<DateRange>(() => {
    const start = parseISO(dateRange.startDate);
    const end = parseISO(dateRange.endDate);
    const periodDays = differenceInDays(end, start) + 1;
    const prevEnd = subDays(start, 1);
    const prevStart = subDays(prevEnd, periodDays - 1);
    return {
      startDate: format(prevStart, 'yyyy-MM-dd'),
      endDate: format(prevEnd, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  // Fetch data freshness
  const { data: freshness } = useDataFreshness();

  // Fetch filter options
  const { data: filterOptions, isLoading: optionsLoading } = useFilterOptions();

  // Fetch data based on filters
  const { data: kpis, isLoading: kpisLoading } = useKPIs(dateRange, filters);
  const { data: previousKpis } = useKPIs(previousDateRange, filters);
  const { data: worksiteHierarchy, isLoading: wsHierarchyLoading } = useWorksiteHierarchy(dateRange, filters);
  const { data: radiologistHierarchy, isLoading: radHierarchyLoading } = useRadiologistHierarchy(dateRange, filters);
  const { data: revenueTrend, isLoading: trendLoading } = useRevenueTrend(dateRange, filters);
  const { data: revenueByModality, isLoading: modalityLoading } = useRevenueByModality(dateRange, filters);
  const { data: topRadiologists, isLoading: topRadLoading } = useTopRadiologists(dateRange, filters);
  const { data: topWorksites, isLoading: topWsLoading } = useTopWorksites(dateRange, filters);

  const chartsLoading = trendLoading || modalityLoading || topRadLoading || topWsLoading;
  const hierarchyLoading = wsHierarchyLoading || radHierarchyLoading;

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format last updated timestamp in browser's local timezone
  const lastUpdatedDisplay = freshness?.last_updated
    ? (() => {
        const date = parseISO(freshness.last_updated);
        return format(date, 'dd/MM/yyyy');
      })()
    : null;

  const activeFilterCount = 
    (filters.worksites?.length || 0) +
    (filters.radiologists?.length || 0) +
    (filters.modalities?.length || 0);

  const dateRangeLabel = `${format(parseISO(dateRange.startDate), 'd MMM yyyy')} – ${format(parseISO(dateRange.endDate), 'd MMM yyyy')}`;

  // AI Search handler - disabled for now
  // const handleAISearch = async (query: string) => {
  //   try {
  //     const { data, error } = await supabase.functions.invoke("executive-ai-query", {
  //       body: { query },
  //     });

  //     if (error) throw error;

  //     return {
  //       response: data.response,
  //       results: data.results,
  //     };
  //   } catch (error) {
  //     console.error("AI Query error:", error);
  //     throw error;
  //   }
  // };

  return (
    <PageContainer maxWidth="2xl" className="space-y-8">
      <PageHeader
        title="Executive Dashboard"
        description="High-level business intelligence and operational performance."
        actions={
          <div className="flex items-center gap-2">
            {lastUpdatedDisplay && (
              <Badge variant="glass" className="px-3 py-1 text-xs">
                Data through {lastUpdatedDisplay}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Jump to <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background">
                <DropdownMenuItem onClick={() => scrollToSection('kpis')}>
                  KPI Overview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scrollToSection('charts')}>
                  Revenue Performance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scrollToSection('hierarchy')}>
                  Hierarchical Views
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Card className="border-border/60 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardContent className="p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reporting period</p>
              <p className="text-sm font-semibold">{dateRangeLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Filters applied</p>
              <p className="text-sm font-semibold">
                {activeFilterCount > 0 ? `${activeFilterCount} active` : "All data"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Data status</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  Karisma Live
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {lastUpdatedDisplay ? `Updated ${lastUpdatedDisplay}` : "Update pending"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Search Box - Disabled for now */}
      {/* <ExecutiveSearchBox onSearch={handleAISearch} /> */}

      {/* Filters */}
      <ExecutiveFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        isLoading={optionsLoading}
      />

      {/* KPIs */}
      <section id="kpis" className="space-y-3 motion-safe:animate-fade-in">
        <div>
          <h2 className="text-lg font-semibold">KPI Overview</h2>
          <p className="text-sm text-muted-foreground">Revenue and volume signals for the selected period.</p>
        </div>
        <ExecutiveKPIs data={kpis} previousData={previousKpis} isLoading={kpisLoading} />
      </section>

      {/* Charts - Full Width */}
      <section id="charts" className="space-y-3 motion-safe:animate-fade-in">
        <div>
          <h2 className="text-lg font-semibold">Revenue Performance</h2>
          <p className="text-sm text-muted-foreground">Trend, modality mix, and top contributors.</p>
        </div>
        <ExecutiveCharts
          revenueTrend={revenueTrend}
          revenueByModality={revenueByModality}
          topRadiologists={topRadiologists}
          topWorksites={topWorksites}
          isLoading={chartsLoading}
        />
      </section>

      {/* Hierarchical Views */}
      <section id="hierarchy" className="space-y-3 motion-safe:animate-fade-in">
        <div>
          <h2 className="text-lg font-semibold">Hierarchy Explorer</h2>
          <p className="text-sm text-muted-foreground">Drill into worksites, radiologists, and modality performance.</p>
        </div>
        <ExecutiveHierarchy
          worksiteData={worksiteHierarchy}
          radiologistData={radiologistHierarchy}
          isLoading={hierarchyLoading}
        />
      </section>
    </PageContainer>
  );
}
