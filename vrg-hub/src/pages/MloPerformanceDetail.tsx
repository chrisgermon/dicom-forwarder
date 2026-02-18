import { useState, useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2, Users, FileText, ClipboardList, Search, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useWorksiteSummary,
  useWorksiteLocations,
  useLocationReferrers,
  useWorksiteModality,
  usePractitionerSummary,
  usePractitionerDaily,
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
import { MloPerformanceGauge } from "@/components/mlo/MloPerformanceGauge";
import { useMloModalityTargets } from "@/hooks/useMloModalityTargets";
import { calculateScaledTargets } from "@/lib/mloTargetUtils";
import { useAuth } from "@/hooks/useAuth";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

type DrilldownLevel = 'worksites' | 'locations' | 'referrers' | 'referrer-detail';

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

// Hook to get MLO assignments with location names
function useMloAssignedLocations(mloId: string | null) {
  return useQuery({
    queryKey: ['mlo-assigned-locations', mloId],
    queryFn: async () => {
      if (!mloId) return [];
      const { data, error } = await supabase
        .from('mlo_assignments')
        .select(`location:locations(id, name)`)
        .eq('user_id', mloId);
      if (error) throw error;
      return data.map(a => a.location?.name).filter((name): name is string => !!name);
    },
    enabled: !!mloId,
  });
}

export default function MloPerformanceDetail() {
  const { mloId } = useParams<{ mloId: string }>();
  const { user, userRole } = useAuth();
  const isMloOnlyView = userRole === 'marketing';

  const [level, setLevel] = useState<DrilldownLevel>('worksites');
  const [selectedWorksite, setSelectedWorksite] = useState<WorksiteSummary | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PractitionerLocation | null>(null);
  const [selectedReferrer, setSelectedReferrer] = useState<ReferringPractitioner | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: mloUser, isLoading: userLoading } = useMloUserDetails(mloId || null);
  const { data: assignedLocationNames } = useMloAssignedLocations(mloId || null);
  const { data: worksites, isLoading: worksitesLoading } = useWorksiteSummary(dateRange);
  const { data: mloTargets } = useMloModalityTargets(
    mloId || undefined,
    undefined,
    dateRange.startDate || undefined,
    dateRange.endDate || undefined
  );

  const { data: locations, isLoading: locationsLoading } = useWorksiteLocations(selectedWorksite?.WorkSiteKey || null, dateRange);
  const { data: referrers, isLoading: referrersLoading } = useLocationReferrers(selectedLocation?.LocationKey || null, selectedWorksite?.WorkSiteKey || null, dateRange);
  const { data: modalityData } = useWorksiteModality(selectedWorksite?.WorkSiteKey || null, dateRange);
  const { data: referrerSummary } = usePractitionerSummary(selectedReferrer?.PractitionerKey || null, dateRange);
  const { data: referrerDailyData } = usePractitionerDaily(selectedReferrer?.PractitionerKey || null);

  // Filter worksites by MLO assignment and search
  const filteredWorksites = useMemo(() => {
    if (!worksites || !assignedLocationNames?.length) return [];
    
    let filtered = worksites.filter(w => {
      const worksiteName = w.WorkSiteName?.toLowerCase().trim();
      return assignedLocationNames.some(locName => 
        worksiteName?.includes(locName.toLowerCase().trim()) ||
        locName.toLowerCase().trim().includes(worksiteName || '')
      );
    });
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w => w.WorkSiteName?.toLowerCase().includes(query));
    }
    return filtered;
  }, [worksites, assignedLocationNames, searchQuery]);

  // Calculate stats from filtered worksites with properly scaled targets
  const mloStats = useMemo(() => {
    const actual = filteredWorksites.reduce((sum, w) => sum + parseInt(w.total_procedures?.toString() || '0'), 0);
    const patients = filteredWorksites.reduce((sum, w) => sum + parseInt(w.total_patients?.toString() || '0'), 0);
    const requests = filteredWorksites.reduce((sum, w) => sum + parseInt(w.total_requests?.toString() || '0'), 0);
    
    // Use the scaling function to properly calculate targets across the date range
    const scaledTargets = calculateScaledTargets(mloTargets, dateRange, mloId);
    
    return { actual, target: scaledTargets.scans, patients, requests, worksiteCount: filteredWorksites.length };
  }, [filteredWorksites, mloTargets, dateRange, mloId]);

  // Filter helpers
  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    if (!searchQuery.trim()) return locations;
    const query = searchQuery.toLowerCase();
    return locations.filter(l => l.LocationName?.toLowerCase().includes(query) || l.LocationCode?.toLowerCase().includes(query));
  }, [locations, searchQuery]);

  const filteredReferrers = useMemo(() => {
    if (!referrers) return [];
    if (!searchQuery.trim()) return referrers;
    const query = searchQuery.toLowerCase();
    return referrers.filter(r => r.PractitionerName?.toLowerCase().includes(query) || r.PractitionerCode?.toLowerCase().includes(query));
  }, [referrers, searchQuery]);

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
    const parts = [mloUser?.full_name || 'MLO'];
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

  if (userLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!mloUser) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-muted-foreground">MLO not found</p>
          <Button asChild variant="link" className="mt-4">
            <Link to="/mlo-performance">← Back to Dashboard</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  // Marketing role can only view their own detail page
  if (isMloOnlyView && user?.id && mloId && mloId !== user.id) {
    return <Navigate to="/mlo-performance" replace />;
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-2 mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/mlo-performance">
            <ChevronLeft className="h-4 w-4 mr-1" />
            All MLOs
          </Link>
        </Button>
      </div>

      <PageHeader
        title={mloUser.full_name || mloUser.email}
        description="MLO Performance Analytics"
      />

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
          <BigQueryDateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
        {level !== 'referrer-detail' && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={getSearchPlaceholder()} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        )}
      </div>

      {/* Performance Gauge */}
      {level === 'worksites' && (
        <div className="mb-6 max-w-md">
          <MloPerformanceGauge
            mloName={mloUser.full_name || mloUser.email}
            actualProcedures={mloStats.actual}
            targetProcedures={mloStats.target}
            periodLabel={getDateRangeLabel()}
          />
        </div>
      )}

      {/* Breadcrumb */}
      {level !== 'worksites' && (
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {getBreadcrumb().map((part, index) => (
              <span key={index} className="flex items-center">
                {index > 0 && <span className="mx-2">/</span>}
                <span className={index === getBreadcrumb().length - 1 ? 'font-medium text-foreground' : ''}>{part}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {level === 'worksites' && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mloStats.patients.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{getDateRangeLabel()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Requests</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mloStats.requests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{getDateRangeLabel()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Procedures</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mloStats.actual.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{getDateRangeLabel()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Worksites</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mloStats.worksiteCount}</div>
              <p className="text-xs text-muted-foreground">Assigned locations</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Worksites Grid */}
      {level === 'worksites' && (
        <div className="space-y-6">
          {worksitesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredWorksites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'No worksites match your search' : 'No assigned worksites found'}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWorksites.map((worksite) => (
                <BigQueryWorksiteCard key={worksite.WorkSiteKey} worksite={worksite} onClick={() => handleSelectWorksite(worksite)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Locations Level */}
      {level === 'locations' && selectedWorksite && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />{selectedWorksite.WorkSiteName}
                  </CardTitle>
                  <CardDescription>Practitioner Locations (Clinics)</CardDescription>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-4 text-sm">
                    <div><span className="text-muted-foreground">Patients:</span> <span className="font-semibold">{parseInt(selectedWorksite.total_patients?.toString() || '0').toLocaleString()}</span></div>
                    <div><span className="text-muted-foreground">Procedures:</span> <span className="font-semibold text-primary">{parseInt(selectedWorksite.total_procedures?.toString() || '0').toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
            </CardHeader>
            {modalityData && modalityData.length > 0 && (
              <CardContent>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={150} height={120}>
                    <PieChart>
                      <Pie data={modalityData.map(m => ({ name: m.Modality, value: parseInt(m.procedure_count?.toString() || '0') }))} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                        {modalityData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {modalityData.slice(0, 6).map((modality, index) => (
                      <div key={modality.Modality} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate">{modality.Modality}</span>
                        <Badge variant="secondary" className="ml-auto">{parseInt(modality.procedure_count?.toString() || '0')}</Badge>
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
              <BigQueryLocationTable locations={filteredLocations} onSelectLocation={handleSelectLocation} isLoading={locationsLoading} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referrers Level */}
      {level === 'referrers' && selectedWorksite && selectedLocation && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{selectedLocation.LocationName}</CardTitle>
                  <CardDescription>Referring Practitioners at this location</CardDescription>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-4 text-sm">
                    <div><span className="text-muted-foreground">Practitioners:</span> <span className="font-semibold">{parseInt(selectedLocation.practitioner_count?.toString() || '0').toLocaleString()}</span></div>
                    <div><span className="text-muted-foreground">Patients:</span> <span className="font-semibold">{parseInt(selectedLocation.total_patients?.toString() || '0').toLocaleString()}</span></div>
                    <div><span className="text-muted-foreground">Procedures:</span> <span className="font-semibold text-primary">{parseInt(selectedLocation.total_procedures?.toString() || '0').toLocaleString()}</span></div>
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
              <BigQueryReferrerTable referrers={filteredReferrers} onSelectReferrer={handleSelectReferrer} isLoading={referrersLoading} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referrer Detail */}
      {level === 'referrer-detail' && selectedReferrer && (
        <BigQueryReferrerDetailPanel referrer={selectedReferrer} summary={referrerSummary?.[0] || null} dailyData={referrerDailyData || []} />
      )}
    </PageContainer>
  );
}
