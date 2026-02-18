import { useState, useEffect } from "react";
import { Search, Building2, User, Phone, Mail, MapPin, Loader2, RefreshCw, Database, Clock, ChevronRight, Copy, Download, Navigation, ExternalLink, Calendar, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useReferrerSearch, Referrer, Clinic } from "@/hooks/useReferrerSearch";
import { useMloVisitInfo, MloVisitInfo } from "@/hooks/useMloVisitInfo";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { getSpecialityIcon, getPrimarySpeciality } from "@/utils/specialityIcons";
import { MloVisitDetails } from "@/components/mlo/MloVisitDetailsPanel";
import { AllVisitsTable } from "@/components/mlo/AllVisitsTable";
import { PracticeManagerSection } from "@/components/referrers/PracticeManagerSection";

// Component to render specialty icon
function SpecialityIcon({ speciality }: { speciality: string | null | undefined }) {
  const { icon: Icon, color } = getSpecialityIcon(speciality);
  return <Icon className={`h-4 w-4 ${color}`} />;
}

// Helper to generate Google Maps URL from address parts
function getGoogleMapsUrl(addressParts: (string | null | undefined)[]): string {
  const address = addressParts.filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// Clickable address component
function AddressLink({ parts, className = "" }: { parts: (string | null | undefined)[]; className?: string }) {
  const address = parts.filter((v, i, arr) => v && arr.indexOf(v) === i).join(", ");
  if (!address) return null;
  
  return (
    <a
      href={getGoogleMapsUrl(parts)}
      target="_blank"
      rel="noopener noreferrer"
      className={`hover:text-primary hover:underline inline-flex items-center gap-1 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {address}
      <ExternalLink className="h-3 w-3 flex-shrink-0" />
    </a>
  );
}

export default function ReferrerLookup() {
  const {
    searchTerm,
    setSearchTerm,
    searchType,
    setSearchType,
    referrerResults,
    clinicResults,
    loading,
    getClinicReferrers,
    getReferrerClinics,
    syncStatus,
    refreshSyncStatus,
  } = useReferrerSearch();

  const { getVisitInfoBatch, getLastVisitForClinic, getLastVisitForReferrer, getAllVisits } = useMloVisitInfo();

  const [selectedClinicReferrers, setSelectedClinicReferrers] = useState<Referrer[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(null);
  const [selectedReferrerClinics, setSelectedReferrerClinics] = useState<Referrer[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [visitInfoMap, setVisitInfoMap] = useState<Map<string, MloVisitInfo>>(new Map());
  const [detailVisitInfo, setDetailVisitInfo] = useState<MloVisitInfo | null>(null);
  const [allVisits, setAllVisits] = useState<MloVisitDetails[]>([]);
  const [loadingAllVisits, setLoadingAllVisits] = useState(false);
  const [mainTab, setMainTab] = useState<"search" | "all-visits">("search");
  const { toast } = useToast();

  // Fetch visit info when search results change
  useEffect(() => {
    const fetchVisitInfo = async () => {
      const clinicKeys = clinicResults.map(c => c.clinic_key);
      const referrerKeys = referrerResults.map(r => r.referrer_key);
      
      if (clinicKeys.length > 0 || referrerKeys.length > 0) {
        const visitInfo = await getVisitInfoBatch(clinicKeys, referrerKeys);
        setVisitInfoMap(visitInfo);
      }
    };
    
    fetchVisitInfo();
  }, [clinicResults, referrerResults, getVisitInfoBatch]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const exportToCSV = () => {
    let csvContent = "";
    let filename = "";

    if (selectedReferrer && selectedReferrerClinics.length > 0) {
      // Export referrer with their clinics
      csvContent = "Referrer Name,Provider Number,Specialty,Phone,Email,Clinic Name,Suburb,State\n";
      selectedReferrerClinics.forEach((entry) => {
        csvContent += `"${selectedReferrer.referrer_name || ""}","${selectedReferrer.provider_number || ""}","${selectedReferrer.specialities || ""}","${selectedReferrer.phone || ""}","${selectedReferrer.email || ""}","${entry.clinic_name || ""}","${entry.suburb || ""}","${entry.state || ""}"\n`;
      });
      filename = `referrer_${selectedReferrer.referrer_name?.replace(/\s+/g, "_") || "export"}.csv`;
    } else if (selectedClinic && selectedClinicReferrers.length > 0) {
      // Export clinic with their referrers
      csvContent = "Clinic Name,Address,Suburb,State,Postcode,Phone,Referrer Name,Provider Number,Specialty,Referrer Phone,Referrer Email\n";
      selectedClinicReferrers.forEach((referrer) => {
        csvContent += `"${selectedClinic.clinic_name || ""}","${selectedClinic.address || ""}","${selectedClinic.suburb || ""}","${selectedClinic.state || ""}","${selectedClinic.postcode || ""}","${selectedClinic.clinic_phone || ""}","${referrer.referrer_name || ""}","${referrer.provider_number || ""}","${referrer.specialities || ""}","${referrer.phone || ""}","${referrer.email || ""}"\n`;
      });
      filename = `clinic_${selectedClinic.clinic_name?.replace(/\s+/g, "_") || "export"}.csv`;
    } else if (referrerResults.length > 0) {
      // Export referrer search results
      csvContent = "Referrer Name,Provider Number,Specialty,Phone,Email,Clinic Name,Suburb,State\n";
      referrerResults.forEach((referrer) => {
        csvContent += `"${referrer.referrer_name || ""}","${referrer.provider_number || ""}","${referrer.specialities || ""}","${referrer.phone || ""}","${referrer.email || ""}","${referrer.clinic_name || ""}","${referrer.suburb || ""}","${referrer.state || ""}"\n`;
      });
      filename = `referrer_search_results.csv`;
    } else if (clinicResults.length > 0) {
      // Export clinic search results
      csvContent = "Clinic Name,Address,Suburb,State,Postcode,Phone,Referrer Count\n";
      clinicResults.forEach((clinic) => {
        csvContent += `"${clinic.clinic_name || ""}","${clinic.address || ""}","${clinic.suburb || ""}","${clinic.state || ""}","${clinic.postcode || ""}","${clinic.clinic_phone || ""}","${clinic.referrer_count || 0}"\n`;
      });
      filename = `clinic_search_results.csv`;
    } else {
      toast({
        title: "Nothing to Export",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "Exported!",
      description: `Downloaded ${filename}`,
    });
  };

  const hasExportableData = 
    referrerResults.length > 0 || 
    clinicResults.length > 0 || 
    (selectedReferrer && selectedReferrerClinics.length > 0) || 
    (selectedClinic && selectedClinicReferrers.length > 0);

  const handleClinicClick = async (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setSelectedReferrer(null);
    setLoadingDetails(true);
    setDetailVisitInfo(null);

    try {
      const [referrers, visitInfo] = await Promise.all([
        getClinicReferrers(clinic.clinic_key),
        getLastVisitForClinic(clinic.clinic_key)
      ]);
      setSelectedClinicReferrers(referrers);
      setDetailVisitInfo(visitInfo);
    } catch (error: any) {
      console.error("Clinic referrers error:", error);
      toast({
        title: "Failed to Load Referrers",
        description: error.message || "Failed to load clinic referrers",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleReferrerClick = async (referrer: Referrer) => {
    setSelectedReferrer(referrer);
    setSelectedClinic(null);
    setLoadingDetails(true);
    setDetailVisitInfo(null);

    try {
      const [clinics, visitInfo] = await Promise.all([
        getReferrerClinics(referrer.referrer_key),
        getLastVisitForReferrer(referrer.referrer_key)
      ]);
      setSelectedReferrerClinics(clinics);
      setDetailVisitInfo(visitInfo);
    } catch (error: any) {
      console.error("Referrer clinics error:", error);
      toast({
        title: "Failed to Load Clinics",
        description: error.message || "Failed to load referrer's clinics",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBack = () => {
    setSelectedClinic(null);
    setSelectedReferrer(null);
    setSelectedClinicReferrers([]);
    setSelectedReferrerClinics([]);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-referrers");
      
      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      toast({
        title: "Sync Complete",
        description: `Synced ${data.referrers?.toLocaleString()} referrers and ${data.clinics?.toLocaleString()} clinics`,
      });
      
      refreshSyncStatus();
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync data",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Check if we're in a detail view
  const isDetailView = selectedClinic || selectedReferrer;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Referrer Lookup</h1>
          <p className="text-muted-foreground">
            Search for referrers and clinics in the database
          </p>
        </div>
        <div className="flex gap-2">
          {hasExportableData && (
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleSync} 
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? "Syncing..." : "Sync Data"}
          </Button>
        </div>
      </div>

      {/* Sync Status Card */}
      <Card className="mb-6 bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">{syncStatus.referrerCount.toLocaleString()}</span>
                  <span className="text-muted-foreground"> referrers</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">{syncStatus.clinicCount.toLocaleString()}</span>
                  <span className="text-muted-foreground"> clinics</span>
                </span>
              </div>
            </div>
            {syncStatus.lastSync && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last synced {formatDistanceToNow(new Date(syncStatus.lastSync), { addSuffix: true })}</span>
              </div>
            )}
            {!syncStatus.lastSync && syncStatus.referrerCount === 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <span>No data synced yet. Click "Sync Data" to populate.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs - Search vs All Visits */}
      {!isDetailView && (
        <Tabs value={mainTab} onValueChange={(v) => {
          setMainTab(v as "search" | "all-visits");
          if (v === "all-visits" && allVisits.length === 0) {
            setLoadingAllVisits(true);
            getAllVisits().then((visits) => {
              setAllVisits(visits as MloVisitDetails[]);
              setLoadingAllVisits(false);
            });
          }
        }} className="mb-6">
          <TabsList>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="all-visits" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              All Visits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-4">
            {/* Existing search content below */}
          </TabsContent>

          <TabsContent value="all-visits" className="mt-4">
            <AllVisitsTable 
              visits={allVisits} 
              isLoading={loadingAllVisits}
            />
          </TabsContent>
        </Tabs>
      )}

      {!isDetailView && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "referrer" | "clinic")}>
              <TabsList className="mb-4">
                <TabsTrigger value="referrer" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Referrers
                </TabsTrigger>
                <TabsTrigger value="clinic" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Clinics
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchType === "referrer" 
                      ? "Search by name, provider number, specialty..." 
                      : "Search by clinic name, suburb, postcode..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground self-center" />}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Referrer Results */}
      {referrerResults.length > 0 && !isDetailView && (
        <div className="grid gap-4 md:grid-cols-2">
          {referrerResults.map((referrer) => (
            <Card 
              key={`${referrer.referrer_key}-${referrer.provider_number}-${referrer.clinic_key}`} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleReferrerClick(referrer)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <SpecialityIcon speciality={referrer.specialities} />
                      <h3 className="font-semibold">{referrer.referrer_name}</h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {referrer.provider_number && (
                      <p className="text-sm text-muted-foreground ml-6">
                        Provider: {referrer.provider_number}
                      </p>
                    )}
                  </div>
                  {referrer.specialities && (
                    <Badge variant="secondary" className="text-xs max-w-[200px] truncate">
                      {getPrimarySpeciality(referrer.specialities)}
                    </Badge>
                  )}
                </div>
                {referrer.clinic_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Building2 className="h-3 w-3" />
                    {referrer.clinic_name}
                  </div>
                )}
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <AddressLink parts={[referrer.clinic_address || referrer.suburb, referrer.suburb, referrer.state, referrer.clinic_postcode]} />
                </div>
                {referrer.clinic_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {referrer.clinic_phone}
                  </div>
                )}
                {referrer.nearest_location && (
                  <div className="flex items-center gap-2 text-sm text-primary mt-1">
                    <Navigation className="h-3 w-3" />
                    <span>Nearest: {referrer.nearest_location.name}</span>
                  </div>
                )}
                {/* MLO Visit Info */}
                {visitInfoMap.get(`referrer_${referrer.referrer_key}`) && (
                  <div className="flex items-center gap-2 text-sm mt-2 p-2 bg-muted/50 rounded">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Last visit: {format(new Date(visitInfoMap.get(`referrer_${referrer.referrer_key}`)!.visit_date), "d MMM yyyy")}
                      {visitInfoMap.get(`referrer_${referrer.referrer_key}`)!.visitor_name && (
                        <span> by {visitInfoMap.get(`referrer_${referrer.referrer_key}`)!.visitor_name}</span>
                      )}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Clinic Results */}
      {clinicResults.length > 0 && !isDetailView && (
        <div className="grid gap-4 md:grid-cols-2">
          {clinicResults.map((clinic) => (
            <Card 
              key={clinic.clinic_key} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleClinicClick(clinic)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{clinic.clinic_name}</h3>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Badge variant="outline">
                    {clinic.referrer_count} referrer{clinic.referrer_count !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <AddressLink parts={[clinic.address, clinic.suburb, clinic.state, clinic.postcode]} />
                </div>
                {clinic.clinic_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {clinic.clinic_phone}
                  </div>
                )}
                {/* MLO Visit Info */}
                {visitInfoMap.get(`clinic_${clinic.clinic_key}`) && (
                  <div className="flex items-center gap-2 text-sm mt-2 p-2 bg-muted/50 rounded">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Last visit: {format(new Date(visitInfoMap.get(`clinic_${clinic.clinic_key}`)!.visit_date), "d MMM yyyy")}
                      {visitInfoMap.get(`clinic_${clinic.clinic_key}`)!.visitor_name && (
                        <span> by {visitInfoMap.get(`clinic_${clinic.clinic_key}`)!.visitor_name}</span>
                      )}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Referrer Detail View */}
      {selectedReferrer && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={handleBack}>
              ← Back to Results
            </Button>
          </div>

          {/* Referrer Details Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <SpecialityIcon speciality={selectedReferrer.specialities} />
                  <div>
                    <h2 className="text-xl font-bold">{selectedReferrer.referrer_name}</h2>
                    {selectedReferrer.provider_number && (
                      <p className="text-muted-foreground">
                        Provider Number: {selectedReferrer.provider_number}
                      </p>
                    )}
                  </div>
                </div>
                {selectedReferrer.specialities && (
                  <Badge variant="secondary">{selectedReferrer.specialities}</Badge>
                )}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {selectedReferrer.phone && (
                  <div className="flex items-center gap-2 text-sm group">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedReferrer.phone}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(selectedReferrer.phone!, "Phone number")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {selectedReferrer.email && (
                  <div className="flex items-center gap-2 text-sm group">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedReferrer.email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(selectedReferrer.email!, "Email address")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {selectedReferrer.nearest_location && (
                <div className="flex items-center gap-2 text-sm mt-4 p-3 bg-primary/10 rounded-lg">
                  <Navigation className="h-4 w-4 text-primary" />
                  <span className="font-medium">Nearest Clinic:</span>
                  <span>{selectedReferrer.nearest_location.name}</span>
                  {selectedReferrer.nearest_location.city && (
                    <span className="text-muted-foreground">
                      ({selectedReferrer.nearest_location.city}, {selectedReferrer.nearest_location.state})
                    </span>
                  )}
                </div>
              )}
              {/* MLO Visit Info in Detail View */}
              {detailVisitInfo && (
                <div className="flex items-center gap-2 text-sm mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">Last MLO Visit:</span>
                  <span>{format(new Date(detailVisitInfo.visit_date), "d MMMM yyyy")}</span>
                  {detailVisitInfo.visitor_name && (
                    <span className="text-muted-foreground">
                      by {detailVisitInfo.visitor_name}
                    </span>
                  )}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {detailVisitInfo.visit_type}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinics List */}
          <h3 className="text-lg font-semibold mb-4">
            Associated Clinics ({selectedReferrerClinics.length})
          </h3>

          {loadingDetails ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedReferrerClinics.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {selectedReferrerClinics.map((entry) => (
                <Card key={`${entry.referrer_key}-${entry.clinic_key}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{entry.clinic_name || "Unknown Clinic"}</h3>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <AddressLink parts={[entry.suburb, entry.state]} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No clinic associations found
            </p>
          )}
        </div>
      )}

      {/* Selected Clinic Detail View */}
      {selectedClinic && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={handleBack}>
              ← Back to Results
            </Button>
          </div>

          {/* Clinic Details Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-2">{selectedClinic.clinic_name}</h2>
              <div className="grid gap-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <AddressLink parts={[selectedClinic.address, selectedClinic.suburb, selectedClinic.state, selectedClinic.postcode]} />
                </div>
                {selectedClinic.clinic_phone && (
                  <div className="flex items-center gap-2 text-sm group">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedClinic.clinic_phone}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(selectedClinic.clinic_phone!, "Phone number")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {/* MLO Visit Info in Clinic Detail View */}
              {detailVisitInfo && (
                <div className="flex items-center gap-2 text-sm mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">Last MLO Visit:</span>
                  <span>{format(new Date(detailVisitInfo.visit_date), "d MMMM yyyy")}</span>
                  {detailVisitInfo.visitor_name && (
                    <span className="text-muted-foreground">
                      by {detailVisitInfo.visitor_name}
                    </span>
                  )}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {detailVisitInfo.visit_type}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Practice Managers */}
          <div className="mb-6">
            <PracticeManagerSection clinicKey={selectedClinic.clinic_key} />
          </div>
          <h3 className="text-lg font-semibold mb-4">
            Referrers at this Clinic ({selectedClinicReferrers.length})
          </h3>

          {loadingDetails ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedClinicReferrers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {selectedClinicReferrers.map((referrer) => (
                <Card 
                  key={`${referrer.referrer_key}-${referrer.provider_number}`}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleReferrerClick(referrer)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{referrer.referrer_name}</h3>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {referrer.provider_number && (
                          <p className="text-sm text-muted-foreground">
                            Provider: {referrer.provider_number}
                          </p>
                        )}
                      </div>
                      {referrer.specialities && (
                        <Badge variant="secondary" className="text-xs">
                          {referrer.specialities}
                        </Badge>
                      )}
                    </div>
                    {referrer.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground group/contact">
                        <Phone className="h-3 w-3" />
                        {referrer.phone}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover/contact:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(referrer.phone!, "Phone number");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {referrer.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground group/contact">
                        <Mail className="h-3 w-3" />
                        {referrer.email}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover/contact:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(referrer.email!, "Email address");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No referrers found for this clinic
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && referrerResults.length === 0 && clinicResults.length === 0 && !isDetailView && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Enter a search term to find referrers or clinics</p>
          <p className="text-sm mt-2">Minimum 2 characters required</p>
        </div>
      )}
    </div>
  );
}
