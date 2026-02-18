import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Users, FileText, ClipboardList, AlertCircle, Loader2, ArrowLeft, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useSharedWorksiteSummary,
  useSharedWorksiteLocations,
  useSharedLocationReferrers,
  useSharedWorksiteModality,
  useSharedPractitionerSummary,
  useSharedPractitionerDaily,
  useSharedOverallStats,
  useSharedOverallModalityStats,
  useSharedFilteredModalityStats,
  useSharedMloModalityTargets,
  useSharedMloAssignedLocations,
  useSharedAllMloAssignments,
  type WorksiteSummary,
  type PractitionerLocation,
  type ReferringPractitioner,
  type DateRange,
} from "@/hooks/useSharedMloBigQueryData";
import { BigQueryWorksiteCard } from "@/components/mlo/BigQueryWorksiteCard";
import { BigQueryLocationTable } from "@/components/mlo/BigQueryLocationTable";
import { BigQueryReferrerTable } from "@/components/mlo/BigQueryReferrerTable";
import { BigQueryReferrerDetailPanel } from "@/components/mlo/BigQueryReferrerDetailPanel";
import { BigQueryDateRangePicker, getDefaultDateRange } from "@/components/mlo/BigQueryDateRangePicker";
import { ModalityTargetsChart } from "@/components/mlo/ModalityTargetsChart";
import { SharedMloSelector } from "@/components/mlo/SharedMloSelector";
// useAllMloModalityTargets removed - using shared hook instead
import { calculateScaledTargets, modalitiesMatch, normalizeModalityName } from "@/lib/mloTargetUtils";
import { getPreviousPeriodRange, createPreviousPeriodMap } from "@/lib/dateRangeUtils";
import { format, parseISO } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// Australian date format constant
const AU_DATE_FORMAT = 'dd/MM/yyyy';

// Vision Radiology Logo - using the public logo file
const VISION_LOGO_URL = "/vision-radiology-logo.png";

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

// Remove local hooks - now using shared versions from useSharedMloBigQueryData

type DrilldownLevel = 'worksites' | 'locations' | 'referrers' | 'referrer-detail';

export default function SharedMloPerformance() {
  const { token } = useParams<{ token: string }>();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  
  // Dashboard state - same as main dashboard
  const [level, setLevel] = useState<DrilldownLevel>('worksites');
  const [selectedWorksite, setSelectedWorksite] = useState<WorksiteSummary | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PractitionerLocation | null>(null);
  const [selectedReferrer, setSelectedReferrer] = useState<ReferringPractitioner | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [searchQuery, setSearchQuery] = useState('');
const [selectedMloId, setSelectedMloId] = useState<string | null>(null);
  const [mloUsers, setMloUsers] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([]);

  // Calculate previous period for trend comparison
  const previousPeriodRange = useMemo(() => getPreviousPeriodRange(dateRange), [dateRange]);

  // MLO assignment hooks - using shared versions that pass the token
  const { data: assignedLocationNames } = useSharedMloAssignedLocations(token || null, selectedMloId);
  const { data: allMloAssignments } = useSharedAllMloAssignments(token || null);

  // All the data hooks - using shared versions that pass the token
  const { data: worksites, isLoading: worksitesLoading } = useSharedWorksiteSummary(token || null, dateRange);
  const { data: overallStats } = useSharedOverallStats(token || null, dateRange);
  const { data: locations, isLoading: locationsLoading } = useSharedWorksiteLocations(token || null, selectedWorksite?.WorkSiteKey || null, dateRange);
  const { data: referrers, isLoading: referrersLoading } = useSharedLocationReferrers(token || null, selectedLocation?.LocationKey || null, selectedWorksite?.WorkSiteKey || null, dateRange);
  const { data: modalityData } = useSharedWorksiteModality(token || null, selectedWorksite?.WorkSiteKey || null, dateRange);
  const { data: overallModalityData } = useSharedOverallModalityStats(token || null, dateRange);
  const { data: referrerSummary } = useSharedPractitionerSummary(token || null, selectedReferrer?.PractitionerKey || null, dateRange);
  const { data: referrerDailyData } = useSharedPractitionerDaily(token || null, selectedReferrer?.PractitionerKey || null);
  
  // Previous period data for trend indicators
  const { data: prevWorksites } = useSharedWorksiteSummary(token || null, previousPeriodRange);
  const { data: prevLocations } = useSharedWorksiteLocations(token || null, selectedWorksite?.WorkSiteKey || null, previousPeriodRange);
  const { data: prevReferrers } = useSharedLocationReferrers(token || null, selectedLocation?.LocationKey || null, selectedWorksite?.WorkSiteKey || null, previousPeriodRange);
  const { data: prevReferrerSummary } = useSharedPractitionerSummary(token || null, selectedReferrer?.PractitionerKey || null, previousPeriodRange);

  // Modality targets - using shared hook that passes the token
  const { data: mloTargets } = useSharedMloModalityTargets(
    token || null,
    selectedMloId || undefined, 
    dateRange.startDate || undefined, 
    dateRange.endDate || undefined
  );

  // Create maps for previous period lookups
  const prevWorksiteMap = useMemo(() => 
    createPreviousPeriodMap(prevWorksites || [], 'WorkSiteKey'), [prevWorksites]);
  const prevLocationMap = useMemo(() => 
    createPreviousPeriodMap(prevLocations || [], 'LocationKey'), [prevLocations]);
  const prevReferrerMap = useMemo(() => 
    createPreviousPeriodMap(prevReferrers || [], 'PractitionerKey'), [prevReferrers]);

  // Get all location names that have an MLO assigned
  const allAssignedLocationNames = useMemo(() => {
    if (!allMloAssignments) return [];
    return allMloAssignments
      .map(a => a.location?.name?.toLowerCase().trim())
      .filter((name): name is string => !!name);
  }, [allMloAssignments]);

  // Get worksite keys for filtered modality stats
  const filteredWorksiteKeys = useMemo(() => {
    if (!worksites) return [];
    
    let filtered = worksites;
    
    // Filter to worksites with MLO assignments
    if (allAssignedLocationNames.length > 0) {
      filtered = filtered.filter(w => {
        const worksiteName = w.WorkSiteName?.toLowerCase().trim();
        return allAssignedLocationNames.some(locName => 
          worksiteName?.includes(locName) || locName.includes(worksiteName || '')
        );
      });
    }
    
    // Further filter by selected MLO if applicable
    if (selectedMloId && assignedLocationNames && assignedLocationNames.length > 0) {
      filtered = filtered.filter(w => {
        const worksiteName = w.WorkSiteName?.toLowerCase().trim();
        return assignedLocationNames.some(locName => 
          worksiteName?.includes(locName.toLowerCase().trim()) ||
          locName.toLowerCase().trim().includes(worksiteName || '')
        );
      });
    }
    
    return filtered.map(w => w.WorkSiteKey).filter((k): k is string => !!k);
  }, [worksites, allAssignedLocationNames, selectedMloId, assignedLocationNames]);

  // Use filtered modality stats when we have filtered worksites
  const { data: filteredModalityData } = useSharedFilteredModalityStats(token || null, filteredWorksiteKeys, dateRange);
  
  // Use filtered data when available, otherwise fall back to overall
  const effectiveModalityData = filteredWorksiteKeys.length > 0 ? filteredModalityData : overallModalityData;

  // Filtered worksites for display
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
    if (selectedMloId && assignedLocationNames && assignedLocationNames.length > 0) {
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
  }, [worksites, searchQuery, selectedMloId, assignedLocationNames, allAssignedLocationNames]);

  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    if (!searchQuery.trim()) return locations;
    const query = searchQuery.toLowerCase();
    return locations.filter(l => 
      l.LocationName?.toLowerCase().includes(query) ||
      l.LocationCode?.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  const filteredReferrers = useMemo(() => {
    if (!referrers) return [];
    if (!searchQuery.trim()) return referrers;
    const query = searchQuery.toLowerCase();
    return referrers.filter(r => 
      r.PractitionerName?.toLowerCase().includes(query) ||
      r.PractitionerCode?.toLowerCase().includes(query)
    );
  }, [referrers, searchQuery]);

  // Performance stats with modality breakdown - use effectiveModalityData for proper filtering
  const performanceStats = useMemo(() => {
    const actual = filteredWorksites.reduce((sum, w) => 
      sum + parseInt(w.total_procedures?.toString() || '0'), 0
    );
    
    const scaledTargets = calculateScaledTargets(mloTargets, dateRange, selectedMloId || undefined);
    const modalityActuals = effectiveModalityData || [];
    
    // Merge actual modality counts into the target breakdown using smart matching
    const byModalityWithActuals = scaledTargets.byModality.map(target => {
      const actualMatch = modalityActuals.find(a => 
        modalitiesMatch(a.Modality || '', target.modalityName || '') ||
        modalitiesMatch(a.Modality || '', target.modalityKey || '')
      );
      return { ...target, actualScans: actualMatch?.procedure_count || 0 };
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
          color: '#64748b',
        });
      }
    });
    
    return { 
      actual, 
      target: scaledTargets.scans,
      byModality: byModalityWithActuals.sort((a, b) => (b.actualScans || 0) - (a.actualScans || 0)),
    };
  }, [filteredWorksites, mloTargets, dateRange, effectiveModalityData, selectedMloId]);

  // Validate the token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No share token provided');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-mlo-performance-share?token=${token}`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

const data = await response.json();
        
        if (data.valid) {
          setIsValid(true);
          // Store MLO users from the validation response
          if (data.mloUsers && Array.isArray(data.mloUsers)) {
            setMloUsers(data.mloUsers);
          }
        } else {
          setError(data.error || 'Invalid share link');
        }
      } catch (err) {
        console.error('Error validating token:', err);
        setError('Failed to validate share link');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Navigation handlers
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
      try {
        const startFormatted = format(parseISO(dateRange.startDate), AU_DATE_FORMAT);
        const endFormatted = format(parseISO(dateRange.endDate), AU_DATE_FORMAT);
        return `${startFormatted} to ${endFormatted}`;
      } catch {
        return `${dateRange.startDate} to ${dateRange.endDate}`;
      }
    }
    return `Last ${dateRange.days} days`;
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validating access...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!isValid || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Vision Radiology</span>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'This link is invalid or has expired'}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!logoError ? (
                <img 
                  src={VISION_LOGO_URL} 
                  alt="Vision Radiology" 
                  className="h-10 object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Building2 className="h-8 w-8 text-primary" />
                  <span className="text-xl font-bold">Vision Radiology</span>
                </div>
              )}
            </div>
            <Badge variant="outline" className="text-xs">Shared View</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">MLO Performance Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time referral and procedure analytics</p>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-xl border border-border/50">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">MLO</label>
            <SharedMloSelector
              value={selectedMloId}
              onChange={setSelectedMloId}
              mloUsers={mloUsers}
              className="w-full h-11 bg-background border-primary/20 hover:border-primary/40 transition-colors"
            />
          </div>
          
          <div className="flex-1 min-w-[280px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date Range</label>
            <BigQueryDateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>

          {level !== 'referrer-detail' && (
            <div className="flex-[2] min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={getSearchPlaceholder()}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-background border-primary/20 hover:border-primary/40 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modality Targets Chart - Show on worksites level */}
        {level === 'worksites' && performanceStats.byModality.length > 0 && (
          <div className="mb-6">
            <ModalityTargetsChart
              modalityTargets={performanceStats.byModality}
              totalTarget={performanceStats.target}
              totalActual={performanceStats.actual}
              title={selectedMloId ? "MLO Targets by Modality" : "Organization-Wide Targets by Modality"}
              description={getDateRangeLabel()}
            />
          </div>
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

        {/* Overall Stats - Only show on worksites level */}
        {level === 'worksites' && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Patients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {parseInt(overallStats?.total_patients?.toString() || '0').toLocaleString()}
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
                  {parseInt(overallStats?.total_requests?.toString() || '0').toLocaleString()}
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
                  {parseInt(overallStats?.total_procedures?.toString() || '0').toLocaleString()}
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
                  {parseInt(overallStats?.total_worksites?.toString() || '0')}
                </div>
                <p className="text-xs text-muted-foreground">Active locations</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content based on drilldown level */}
        {level === 'worksites' && (
          <div className="space-y-6">
            {worksitesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
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
                    previousPeriod={prevWorksiteMap.get(worksite.WorkSiteKey) || null}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {level === 'locations' && selectedWorksite && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {selectedWorksite.WorkSiteName}
                    </CardTitle>
                    <CardDescription>Practitioner Locations (Clinics)</CardDescription>
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {selectedLocation.LocationName}
                    </CardTitle>
                    <CardDescription>Referring Practitioners at this location</CardDescription>
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
      </main>

      {/* Footer */}
      <footer className="border-t mt-8 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Vision Radiology Hub - MLO Performance Dashboard</p>
          <p className="text-xs mt-1">This is a read-only shared view</p>
        </div>
      </footer>
    </div>
  );
}
