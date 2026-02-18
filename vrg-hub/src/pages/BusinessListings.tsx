import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Globe,
  MapPin,
  Pencil,
  Plus,
  Filter,
  RefreshCw,
} from 'lucide-react';

const PLATFORMS = [
  { key: 'google_business', label: 'Google Business Profile', manageUrl: 'https://business.google.com/', icon: '🔍' },
  { key: 'apple_maps', label: 'Apple Maps Connect', manageUrl: 'https://mapsconnect.apple.com/', icon: '🍎' },
  { key: 'bing_places', label: 'Bing Places', manageUrl: 'https://www.bingplaces.com/', icon: '🅱️' },
  { key: 'yelp', label: 'Yelp for Business', manageUrl: 'https://biz.yelp.com/', icon: '⭐' },
  { key: 'healthdirect', label: 'Healthdirect', manageUrl: 'https://about.healthdirect.gov.au/nhsd', icon: '🏥' },
  { key: 'hotdoc', label: 'HotDoc', manageUrl: 'https://www.hotdoc.com.au/dashboard', icon: '📋' },
  { key: 'yellow_pages', label: 'Yellow Pages', manageUrl: 'https://www.yellowpages.com.au/', icon: '📒' },
  { key: 'true_local', label: 'True Local', manageUrl: 'https://www.truelocal.com.au/', icon: '📍' },
] as const;

// type PlatformKey derived from PLATFORMS

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: 'bg-muted text-muted-foreground', icon: MinusCircle },
  { value: 'claimed', label: 'Claimed', color: 'bg-blue-100 text-blue-800', icon: Clock },
  { value: 'verified', label: 'Verified', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  { value: 'needs_update', label: 'Needs Update', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  { value: 'suspended', label: 'Suspended', color: 'bg-red-100 text-red-800', icon: XCircle },
  { value: 'not_applicable', label: 'N/A', color: 'bg-muted text-muted-foreground', icon: MinusCircle },
];

interface BusinessListing {
  id: string;
  location_id: string;
  platform: string;
  listing_url: string | null;
  status: string;
  notes: string | null;
  last_verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Location {
  id: string;
  name: string;
  address?: string | null;
}

function getStatusConfig(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
}

function getPlatformConfig(key: string) {
  return PLATFORMS.find(p => p.key === key);
}

export default function BusinessListings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [editListing, setEditListing] = useState<BusinessListing | null>(null);
  const [newListing, setNewListing] = useState<{ locationId: string; platform: string } | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formStatus, setFormStatus] = useState('not_started');
  const [formNotes, setFormNotes] = useState('');

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-for-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Location[];
    },
  });

  // Fetch all business listings
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['business-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_listings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BusinessListing[];
    },
  });

  // Upsert mutation
  const upsertMutation = useMutation({
    mutationFn: async (payload: { id?: string; location_id: string; platform: string; listing_url: string | null; status: string; notes: string | null }) => {
      if (payload.id) {
        const { error } = await supabase
          .from('business_listings')
          .update({
            listing_url: payload.listing_url,
            status: payload.status,
            notes: payload.notes,
            last_verified_at: payload.status === 'verified' ? new Date().toISOString() : undefined,
            verified_by: payload.status === 'verified' ? user?.id : undefined,
          })
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_listings')
          .insert({
            location_id: payload.location_id,
            platform: payload.platform,
            listing_url: payload.listing_url,
            status: payload.status,
            notes: payload.notes,
            last_verified_at: payload.status === 'verified' ? new Date().toISOString() : undefined,
            verified_by: payload.status === 'verified' ? user?.id : undefined,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-listings'] });
      toast.success('Listing saved successfully');
      setEditListing(null);
      setNewListing(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save listing');
    },
  });

  // Google sync mutation
  const syncGoogleMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('sync-google-business-listings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['business-listings'] });
      toast.success(`Synced ${data?.synced ?? 0} Google listings`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Google sync failed');
    },
  });

  const handleSave = () => {
    if (editListing) {
      upsertMutation.mutate({
        id: editListing.id,
        location_id: editListing.location_id,
        platform: editListing.platform,
        listing_url: formUrl || null,
        status: formStatus,
        notes: formNotes || null,
      });
    } else if (newListing) {
      upsertMutation.mutate({
        location_id: newListing.locationId,
        platform: newListing.platform,
        listing_url: formUrl || null,
        status: formStatus,
        notes: formNotes || null,
      });
    }
  };

  const openEdit = (listing: BusinessListing) => {
    setEditListing(listing);
    setFormUrl(listing.listing_url || '');
    setFormStatus(listing.status);
    setFormNotes(listing.notes || '');
  };

  const openNew = (locationId: string, platform: string) => {
    setNewListing({ locationId, platform });
    setFormUrl('');
    setFormStatus('not_started');
    setFormNotes('');
  };

  // Group listings by location
  const listingsByLocation = useMemo(() => {
    const map = new Map<string, BusinessListing[]>();
    listings.forEach(l => {
      const arr = map.get(l.location_id) || [];
      arr.push(l);
      map.set(l.location_id, arr);
    });
    return map;
  }, [listings]);

  // Filter locations
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      if (searchQuery && !loc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' || platformFilter !== 'all') {
        const locListings = listingsByLocation.get(loc.id) || [];
        if (statusFilter !== 'all' && !locListings.some(l => l.status === statusFilter)) return false;
        if (platformFilter !== 'all' && !locListings.some(l => l.platform === platformFilter)) return false;
      }
      return true;
    });
  }, [locations, searchQuery, statusFilter, platformFilter, listingsByLocation]);

  // Summary stats
  const stats = useMemo(() => {
    const total = locations.length * PLATFORMS.length;
    const filled = listings.length;
    const verified = listings.filter(l => l.status === 'verified').length;
    const needsUpdate = listings.filter(l => l.status === 'needs_update').length;
    return { total, filled, verified, needsUpdate, notStarted: total - filled };
  }, [locations, listings]);

  const isDialogOpen = !!editListing || !!newListing;

  return (
    <PageContainer maxWidth="lg">
      <div className="flex items-center justify-between mb-2">
        <PageHeader
          title="Business Listings"
          description="Track and manage your business directory registrations across all locations"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncGoogleMutation.mutate()}
          disabled={syncGoogleMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncGoogleMutation.isPending ? 'animate-spin' : ''}`} />
          {syncGoogleMutation.isPending ? 'Syncing...' : 'Sync Google'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{stats.verified}</div>
            <div className="text-xs text-muted-foreground">Verified</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{stats.needsUpdate}</div>
            <div className="text-xs text-muted-foreground">Needs Update</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{stats.filled}</div>
            <div className="text-xs text-muted-foreground">Tracked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{stats.notStarted}</div>
            <div className="text-xs text-muted-foreground">Not Started</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map(p => (
              <SelectItem key={p.key} value={p.key}>{p.icon} {p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading listings...</div>
      ) : filteredLocations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No locations found</div>
      ) : (
        <div className="space-y-4">
          {filteredLocations.map(location => {
            const locListings = listingsByLocation.get(location.id) || [];
            const listingMap = new Map(locListings.map(l => [l.platform, l]));

            return (
              <Card key={location.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {location.name}
                  </CardTitle>
                  {location.address && (
                    <p className="text-xs text-muted-foreground">{location.address}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {PLATFORMS.map(platform => {
                      const listing = listingMap.get(platform.key);
                      const statusConfig = listing ? getStatusConfig(listing.status) : getStatusConfig('not_started');
                      const StatusIcon = statusConfig.icon;

                      return (
                        <div
                          key={platform.key}
                          className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-lg shrink-0">{platform.icon}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{platform.label}</div>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusConfig.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {listing?.listing_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => window.open(listing.listing_url!, '_blank')}
                                title="Open listing"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {listing ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(listing)}
                                title="Edit listing"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openNew(location.id, platform.key)}
                                title="Add listing"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => window.open(platform.manageUrl, '_blank')}
                              title={`Manage on ${platform.label}`}
                            >
                              <Globe className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setEditListing(null); setNewListing(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editListing ? 'Edit' : 'Add'} Business Listing
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Platform</Label>
              <div className="text-sm font-medium mt-1">
                {getPlatformConfig(editListing?.platform || newListing?.platform || '')?.icon}{' '}
                {getPlatformConfig(editListing?.platform || newListing?.platform || '')?.label}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Listing URL</Label>
              <Input
                placeholder="https://..."
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditListing(null); setNewListing(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
