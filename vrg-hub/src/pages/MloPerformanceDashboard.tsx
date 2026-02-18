import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2, Users, FileText, ClipboardList, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useWorksiteSummary,
  useWorksiteLocations,
  useLocationReferrers,
  useWorksiteModality,
  usePractitionerSummary,
  usePractitionerDaily,
  useOverallModalityStats,
  useFilteredModalityStats,
  type WorksiteSummary,
  type PractitionerLocation,
  type ReferringPractitioner,
  type DateRange,
} from "@/hooks/useMloBigQueryData";
import { BigQueryWorksiteCard } from "@/components/mlo/BigQueryWorksiteCard";
import { BigQueryLocationTable } from "@/components/mlo/BigQueryLocationTable";
import { BigQueryReferrerTable } from "@/components/mlo/BigQueryReferrerTable";
import { BigQueryReferrerDetailPanel } from "@/components/mlo/BigQueryReferrerDetailPanel";
import { BigQueryDateRangePicker, getDefaultDateRange } from "@/components/mlo/BigQueryDateRangePicker";
import { MloSelector } from "@/components/mlo/MloSelector";
import { MloPerformanceGauge } from "@/components/mlo/MloPerformanceGauge";
import { ModalityTargetsChart } from "@/components/mlo/ModalityTargetsChart";
import { useAllMloModalityTargets } from "@/hooks/useMloModalityTargets";
import { calculateScaledTargets, modalitiesMatch, normalizeModalityName } from "@/lib/mloTargetUtils";
import { MloShareButton } from "@/components/mlo/MloShareButton";
import { getPreviousPeriodRange, createPreviousPeriodMap } from "@/lib/dateRangeUtils";
import { useAuth } from "@/hooks/useAuth";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

type DrilldownLevel = 'worksites' | 'locations' | 'referrers' | 'referrer-detail';

// Hook to get MLO assignments with location names
function useMloAssignedLocations(mloId: string | null) {
  return useQuery({
    queryKey: ['mlo-assigned-locations', mloId],
    queryFn: async () => {
      if (!mloId) return [];
      
      const { data, error } = await supabase
        .from('mlo_assignments')
        .select(`
          location:locations(id, name)
        `)
        .eq('user_id', mloId);

      if (error) throw error;
      
      // Extract location names for matching with BigQuery worksite names
      return data
        .map(a => a.location?.name)
        .filter((name): name is string => !!name);
    },
    enabled: !!mloId,
  });
}

// Hook to get all MLO assignments for worksite-to-MLO mapping.
// When restrictToUserId is set (e.g. for marketing role), only that user's assignments are returned.
function useAllMloAssignmentsWithLocations(restrictToUserId: string | null = null) {
  return useQuery({
    queryKey: ['all-mlo-assignments-locations', restrictToUserId],
    queryFn: async () => {
      let query = supabase
        .from('mlo_assignments')
        .select(`
          location:locations(id, name),
          user:profiles!mlo_assignments_user_id_fkey(id, full_name, email)
        `);
      if (restrictToUserId) {
        query = query.eq('user_id', restrictToUserId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Hook to get MLO user details
function useMloUserDetails(mloId: string | null) {
  return useQuery({
    queryKey: ['mlo-user-details', mloId],
    queryFn: async () => {
      if (!mloId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', mloId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!mloId,
  });
}

export default function MloPerformanceDashboard() {
  const { user, userRole } = useAuth();
  const isMloOnlyView = userRole === 'marketing'; // MLO sees only their own data; admins/managers see all

  const [level, setLevel] = useState<DrilldownLevel>('worksites');
  const [selectedWorksite, setSelectedWorksite] = useState<WorksiteSummary | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PractitionerLocation | null>(null);
  const [selectedReferrer, setSelectedReferrer] = useState<ReferringPractitioner | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMloId, setSelectedMloId] = useState<string | null>(null);

  // When user is MLO (marketing role), lock selection to current user and only fetch their assignments
  const effectiveMloId = isMloOnlyView ? (user?.id ?? null) : selectedMloId;
  const assignmentsUserId = isMloOnlyView ? (user?.id ?? null) : null;

  // Calculate previous period for trend comparison
  const previousPeriodRange = useMemo(() => getPreviousPeriodRange(dateRange), [dateRange]);

  const { data: worksites, isLoading: worksitesLoading } = useWorksiteSummary(dateRange);
  const { data: locations, isLoading: locationsLoading } = useWorksiteLocations(selectedWorksite?.WorkSiteKey || null, dateRange);
  const { data: referrers, isLoading: referrersLoading } = useLocationReferrers(selectedLocation?.LocationKey || null, selectedWorksite?.WorkSiteKey || null, dateRange);
  const { data: modalityData } = useWorksiteModality(selectedWorksite?.WorkSiteKey || null, dateRange);
  const { data: overallModalityData } = useOverallModalityStats(dateRange);
  const { data: referrerSummary } = usePractitionerSummary(selectedReferrer?.PractitionerKey || null, dateRange);
  const { data: referrerDailyData } = usePractitionerDaily(selectedReferrer?.PractitionerKey || null);
  
  // Previous period data for trend indicators
  const { data: prevWorksites } = useWorksiteSummary(previousPeriodRange);
  const { data: prevLocations } = useWorksiteLocations(selectedWorksite?.WorkSiteKey || null, previousPeriodRange);
  const { data: prevReferrers } = useLocationReferrers(selectedLocation?.LocationKey || null, selectedWorksite?.WorkSiteKey || null, previousPeriodRange);
  const { data: prevReferrerSummary } = usePractitionerSummary(selectedReferrer?.PractitionerKey || null, previousPeriodRange);

  // Create maps for previous period lookups
  const prevWorksiteMap = useMemo(() => 
    createPreviousPeriodMap(prevWorksites || [], 'WorkSiteKey'), [prevWorksites]);
  const prevLocationMap = useMemo(() => 
    createPreviousPeriodMap(prevLocations || [], 'LocationKey'), [prevLocations]);
  const prevReferrerMap = useMemo(() => 
    createPreviousPeriodMap(prevReferrers || [], 'PractitionerKey'), [prevReferrers]);
  
  // MLO-specific data (use effectiveMloId so marketing role only sees own data)
  const { data: assignedLocationNames } = useMloAssignedLocations(effectiveMloId);
  const { data: mloUser } = useMloUserDetails(effectiveMloId);
  const { data: mloTargets } = useAllMloModalityTargets(
    undefined, 
    dateRange.startDate || undefined, 
    dateRange.endDate || undefined
  );
  const { data: allMloAssignments } = useAllMloAssignmentsWithLocations(assignmentsUserId);

  // Compute worksite keys for filtered modality stats (after worksites and assignments are loaded)
  const filteredWorksiteKeys = useMemo(() => {
    if (!worksites) return [];
    if (!allMloAssignments) return [];
    
    const allAssignedNames = allMloAssignments
      .map(a => a.location?.name?.toLowerCase().trim())
      .filter((name): name is string => !!name);
    
    let filtered = worksites.filter(w => {
      const worksiteName = w.WorkSiteName?.toLowerCase().trim();
      return allAssignedNames.some(locName => 
        worksiteName?.includes(locName) || locName.includes(worksiteName || '')
      );
    });
    
    // Further filter by selected MLO if applicable
    if (effectiveMloId && assignedLocationNames && assignedLocationNames.length > 0) {
      filtered = filtered.filter(w => {
        const worksiteName = w.WorkSiteName?.toLowerCase().trim();
        return assignedLocationNames.some(locName => 
          worksiteName?.includes(locName.toLowerCase().trim()) ||
          locName.toLowerCase().trim().includes(worksiteName || '')
        );
      });
    }
    
    return filtered.map(w => w.WorkSiteKey).filter((k): k is string => !!k);
  }, [worksites, allMloAssignments, effectiveMloId, assignedLocationNames]);

  // Use filtered modality stats when we have filtered worksites
  const { data: filteredModalityData } = useFilteredModalityStats(filteredWorksiteKeys, dateRange);
  
  // Use filtered data when available, otherwise fall back to overall
  const effectiveModalityData = filteredWorksiteKeys.length > 0 ? filteredModalityData : overallModalityData;

  // Create a map of worksite names to assigned MLOs
  const worksiteToMloMap = useMemo(() => {
    if (!allMloAssignments) return new Map();
    const map = new Map<string, { id: string; full_name: string | null; email: string }>();
    
    allMloAssignments.forEach(assignment => {
      const locName = assignment.location?.name?.toLowerCase().trim();
      if (locName && assignment.user) {
        map.set(locName, {
          id: assignment.user.id,
          full_name: assignment.user.full_name,
          email: assignment.user.email,
        });
      }
    });
    return map;
  }, [allMloAssignments]);

  // Helper to find MLO for a worksite
  const getMloForWorksite = (worksiteName: string | undefined) => {
    if (!worksiteName) return null;
    const name = worksiteName.toLowerCase().trim();
    
    // Exact match first
    if (worksiteToMloMap.has(name)) {
      return worksiteToMloMap.get(name)!;
    }
    
    // Partial match
    for (const [locName, mlo] of worksiteToMloMap.entries()) {
      if (name.includes(locName) || locName.includes(name)) {
        return mlo;
      }
    }
    return null;
  };

  // Get all location names that have an MLO assigned
  const allAssignedLocationNames = useMemo(() => {
    if (!allMloAssignments) return [];
    return allMloAssignments
      .map(a => a.location?.name?.toLowerCase().trim())
      .filter((name): name is string => !!name);
  }, [allMloAssignments]);

  // Filter worksites by search AND MLO assignment
  const filteredWorksites = useMemo(() => {
    if (!worksites) return [];
    
    let filtered = worksites;
    
    // ALWAYS filter to only show worksites that have an MLO assigned
    if (allAssignedLocationNames.length > 0) {
      filtered = filtered.filter(w => {
        const worksiteName = w.WorkSiteName?.toLowerCase().trim();
        return allAssignedLocationNames.some(locName => 
          worksiteName?.includes(locName) || locName.includes(worksiteName || '')
        );
      });
    }
    
    // Further filter by selected MLO's assigned locations (if specific MLO selected)
    if (effectiveMloId && assignedLocationNames && assignedLocationNames.length > 0) {
      filtered = filtered.filter(w => {
        const worksiteName = w.WorkSiteName?.toLowerCase().trim();
        return assignedLocationNames.some(locName => 
          worksiteName?.includes(locName.toLowerCase().trim()) ||
          locName.toLowerCase().trim().includes(worksiteName || '')
        );
      });
    }
    
    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w => 
        w.WorkSiteName?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [worksites, searchQuery, effectiveMloId, assignedLocationNames, allAssignedLocationNames]);

  // Calculate MLO performance stats with properly scaled targets including modality breakdown
  const mloPerformanceStats = useMemo(() => {
    // Sum actual procedures from filtered worksites
    const actual = filteredWorksites.reduce((sum, w) => 
      sum + parseInt(w.total_procedures?.toString() || '0'), 0
    );
    
    // Use the scaling function to properly calculate targets across the date range
    const scaledTargets = calculateScaledTargets(mloTargets, dateRange, effectiveMloId || undefined);
    
    // Merge actual modality counts into the target breakdown - use effectiveModalityData for proper filtering
    const modalityActuals = effectiveModalityData || [];
    const byModalityWithActuals = scaledTargets.byModality.map(target => {
      // Match by modality name using the smart matching function
      const actualMatch = modalityActuals.find(a => 
        modalitiesMatch(a.Modality || '', target.modalityName || '') ||
        modalitiesMatch(a.Modality || '', target.modalityKey || '')
      );
      return {
        ...target,
        actualScans: actualMatch?.procedure_count || 0,
      };
    });

    // Add any modalities that have actuals but no targets
    modalityActuals.forEach(actual => {
      const hasTarget = byModalityWithActuals.some(t => 
        modalitiesMatch(t.modalityName || '', actual.Modality || '') ||
        modalitiesMatch(t.modalityKey || '', actual.Modality || '')
      );
      if (!hasTarget && actual.procedure_count > 0) {
        byModalityWithActuals.push({
          modalityId: actual.Modality,
          modalityName: actual.Modality,
          modalityKey: normalizeModalityName(actual.Modality),
          icon: null,
          targetReferrals: 0,
          targetScans: 0,
          actualScans: actual.procedure_count,
          color: '#64748b', // slate default
        });
      }
    });
    
    return { 
      actual, 
      target: scaledTargets.scans,
      byModality: byModalityWithActuals.sort((a, b) => (b.actualScans || 0) - (a.actualScans || 0)),
    };
  }, [effectiveMloId, filteredWorksites, mloTargets, dateRange, effectiveModalityData]);

  // Filter referrers by search
  const filteredReferrers = useMemo(() => {
    if (!referrers) return [];
    if (!searchQuery.trim()) return referrers;
    const query = searchQuery.toLowerCase();
    return referrers.filter(r => 
      r.PractitionerName?.toLowerCase().includes(query) ||
      r.PractitionerCode?.toLowerCase().includes(query)
    );
  }, [referrers, searchQuery]);

  // Filter locations by search
  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    if (!searchQuery.trim()) return locations;
    const query = searchQuery.toLowerCase();
    return locations.filter(l => 
      l.LocationName?.toLowerCase().includes(query) ||
      l.LocationCode?.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  const handleSelectWorksite = (worksite: WorksiteSummary) => {
    setSelectedWorksite(worksite);
    setSelectedLocation(null);
    setSelectedReferrer(null);
    setSearchQuery('');
    setLevel('locations');
  };

  const handleSelectLocation = (location: PractitionerLocation) => {
    setSelectedLocation(location);
    setSelectedReferrer(null);
    setSearchQuery('');
    setLevel('referrers');
  };

  const handleSelectReferrer = (referrer: ReferringPractitioner) => {
    setSelectedReferrer(referrer);
    setLevel('referrer-detail');
  };

  const handleBack = () => {
    if (level === 'referrer-detail') {
      setSelectedReferrer(null);
      setLevel('referrers');
    } else if (level === 'referrers') {
      setSelectedLocation(null);
      setSearchQuery('');
      setLevel('locations');
    } else if (level === 'locations') {
      setSelectedWorksite(null);
      setSearchQuery('');
      setLevel('worksites');
    }
  };

  const getBreadcrumb = () => {
    const parts = ['All Worksites'];
    if (selectedWorksite) parts.push(selectedWorksite.WorkSiteName);
    if (selectedLocation) parts.push(selectedLocation.LocationName);
    if (selectedReferrer) parts.push(selectedReferrer.PractitionerName);
    return parts;
  };

  const getSearchPlaceholder = () => {
    switch (level) {
      case 'worksites': return 'Search worksites...';
      case 'locations': return 'Search practitioner locations...';
      case 'referrers': return 'Search practitioners...';
      default: return 'Search...';
    }
  };

  const getDateRangeLabel = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return `${dateRange.startDate} to ${dateRange.endDate}`;
    }
    return `Last ${dateRange.days} days`;
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-2">
        <PageHeader
          title="MLO Performance Dashboard"
          description="Real-time referral and procedure analytics from BigQuery"
        />
        <MloShareButton />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* MLO Selector (hidden for marketing role – they only see their own data) */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">MLO:</span>
          {isMloOnlyView ? (
            <span className="text-sm font-medium" title="You can only view your own performance">
              Your performance
            </span>
          ) : (
            <MloSelector
              value={selectedMloId}
              onChange={setSelectedMloId}
              className="w-[200px]"
            />
          )}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
          <BigQueryDateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        {/* Search Input */}
        {level !== 'referrer-detail' && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>

      {/* MLO Performance Section - Show when MLO is selected (or own view for marketing) */}
      {effectiveMloId && mloUser && level === 'worksites' && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <MloPerformanceGauge
            mloName={mloUser.full_name || mloUser.email}
            actualProcedures={mloPerformanceStats.actual}
            targetProcedures={mloPerformanceStats.target}
            periodLabel={getDateRangeLabel()}
          />
          <ModalityTargetsChart
            modalityTargets={mloPerformanceStats.byModality}
            totalTarget={mloPerformanceStats.target}
            totalActual={mloPerformanceStats.actual}
            description={getDateRangeLabel()}
          />
        </div>
      )}

      {/* Prompt to select MLO when none selected (or loading for marketing) */}
      {!effectiveMloId && level === 'worksites' && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            {isMloOnlyView ? (
              <>
                <h3 className="text-lg font-semibold mb-2">Loading your performance</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Your assigned worksites and metrics will appear here once loaded.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Select an MLO to view performance</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Choose a Marketing Liaison Officer from the dropdown above to see their assigned worksites, targets, and performance metrics.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Breadcrumb */}
      {level !== 'worksites' && (
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {getBreadcrumb().map((part, index) => (
              <span key={index} className="flex items-center">
                {index > 0 && <span className="mx-2">/</span>}
                <span className={index === getBreadcrumb().length - 1 ? 'font-medium text-foreground' : ''}>
                  {part}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Overall Stats - Only show on worksites level when MLO is selected */}
      {level === 'worksites' && effectiveMloId && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredWorksites.reduce((sum, w) => sum + parseInt(w.total_patients?.toString() || '0'), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{getDateRangeLabel()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Requests</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredWorksites.reduce((sum, w) => sum + parseInt(w.total_requests?.toString() || '0'), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{getDateRangeLabel()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Procedures</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredWorksites.reduce((sum, w) => sum + parseInt(w.total_procedures?.toString() || '0'), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{getDateRangeLabel()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Worksites</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredWorksites.length}
              </div>
              <p className="text-xs text-muted-foreground">Active locations</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content based on drilldown level - only show when MLO selected */}
      {level === 'worksites' && effectiveMloId && (
        <div className="space-y-6">
          {worksitesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredWorksites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'No worksites match your search' : 'No worksites found'}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWorksites.map((worksite) => (
                <BigQueryWorksiteCard
                  key={worksite.WorkSiteKey}
                  worksite={worksite}
                  onClick={() => handleSelectWorksite(worksite)}
                  assignedMlo={getMloForWorksite(worksite.WorkSiteName)}
                  previousPeriod={prevWorksiteMap.get(worksite.WorkSiteKey) || null}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {level === 'locations' && selectedWorksite && (
        <div className="space-y-6">
          {/* Worksite Summary Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {selectedWorksite.WorkSiteName}
                  </CardTitle>
                  <CardDescription>
                    Practitioner Locations (Clinics)
                  </CardDescription>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Patients:</span>{' '}
                      <span className="font-semibold">{parseInt(selectedWorksite.total_patients?.toString() || '0').toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Procedures:</span>{' '}
                      <span className="font-semibold text-primary">{parseInt(selectedWorksite.total_procedures?.toString() || '0').toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            {modalityData && modalityData.length > 0 && (
              <CardContent>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={150} height={120}>
                    <PieChart>
                      <Pie
                        data={modalityData.map(m => ({
                          name: m.Modality,
                          value: parseInt(m.procedure_count?.toString() || '0')
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {modalityData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {modalityData.slice(0, 6).map((modality, index) => (
                      <div key={modality.Modality} className="flex items-center gap-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate">{modality.Modality}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {parseInt(modality.procedure_count?.toString() || '0')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Locations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Practitioner Locations</CardTitle>
              <CardDescription>Click a location to see its referring practitioners</CardDescription>
            </CardHeader>
            <CardContent>
              <BigQueryLocationTable
                locations={filteredLocations}
                onSelectLocation={handleSelectLocation}
                isLoading={locationsLoading}
                previousPeriodMap={prevLocationMap}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {level === 'referrers' && selectedWorksite && selectedLocation && (
        <div className="space-y-6">
          {/* Location Summary Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {selectedLocation.LocationName}
                  </CardTitle>
                  <CardDescription>
                    Referring Practitioners at this location
                  </CardDescription>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Practitioners:</span>{' '}
                      <span className="font-semibold">{parseInt(selectedLocation.practitioner_count?.toString() || '0').toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Patients:</span>{' '}
                      <span className="font-semibold">{parseInt(selectedLocation.total_patients?.toString() || '0').toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Procedures:</span>{' '}
                      <span className="font-semibold text-primary">{parseInt(selectedLocation.total_procedures?.toString() || '0').toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Referrers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Referring Practitioners</CardTitle>
              <CardDescription>Click a practitioner to see their referral details</CardDescription>
            </CardHeader>
            <CardContent>
              <BigQueryReferrerTable
                referrers={filteredReferrers}
                onSelectReferrer={handleSelectReferrer}
                isLoading={referrersLoading}
                previousPeriodMap={prevReferrerMap}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {level === 'referrer-detail' && selectedReferrer && (
        <BigQueryReferrerDetailPanel
          referrer={selectedReferrer}
          summary={referrerSummary?.[0] || null}
          dailyData={referrerDailyData || []}
          previousPeriod={prevReferrerSummary?.[0] || null}
        />
      )}
    </PageContainer>
  );
}
