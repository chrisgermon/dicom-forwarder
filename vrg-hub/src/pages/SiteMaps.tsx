import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { GOOGLE_MAPS_API_KEY } from '@/lib/googleMapsConfig';

interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  brand_id: string;
  latitude?: number | null;
  longitude?: number | null;
  brands?: {
    display_name: string;
  };
}

interface Brand {
  id: string;
  display_name: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = {
  lat: -25.2744, // Australia center
  lng: 133.7751,
};

export default function SiteMaps() {
  // Small loader component to initialize Google Maps script only when API key is ready
  function MapsLoader({ apiKey, children, onLoaded }: { apiKey: string; children: () => JSX.Element; onLoaded?: () => void }) {
    const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey });

    useEffect(() => {
      if (isLoaded) {
        console.log('[SiteMaps] Google Maps script isLoaded');
        onLoaded?.();
      }
    }, [isLoaded, onLoaded]);

    if (loadError) {
      console.error('[SiteMaps] Google Maps loadError', loadError);
      return (
        <div className="container mx-auto py-8 space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading Google Maps. Verify domain restrictions for your API key include your preview domain and that billing is enabled.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    if (!isLoaded) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return children();
  }
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocodedLocations, setGeocodedLocations] = useState<Map<string, google.maps.LatLngLiteral>>(new Map());
  const [geocoding, setGeocoding] = useState(false);

  const [apiKey, setApiKey] = useState<string>(GOOGLE_MAPS_API_KEY);
  const [mapsLoaded, setMapsLoaded] = useState<boolean>(false);
  const [mapsLoadTimedOut, setMapsLoadTimedOut] = useState<boolean>(false);

  // Fallback: fetch public key from backend if not in frontend env
  useEffect(() => {
    const fetchKey = async () => {
      if (!apiKey) {
        try {
          const { data, error } = await supabase.functions.invoke('public-google-maps-key');
          if (!error && data?.apiKey) {
            console.log('[SiteMaps] Maps API key fetched from backend. hasKey:', data.hasKey);
            setApiKey(data.apiKey);
          }
        } catch (e) {
          console.error('Failed to fetch public Google Maps key', e);
        }
      }
    };
    fetchKey();
  }, [apiKey]);

  // Show a helpful error if the Maps script takes too long to load
  useEffect(() => {
    if (!apiKey || mapsLoaded) return;
    const t = setTimeout(() => {
      console.error('[SiteMaps] Google Maps load timed out. Origin:', window.location.origin);
      setMapsLoadTimedOut(true);
    }, 15000);
    return () => clearTimeout(t);
  }, [apiKey, mapsLoaded]);

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, display_name')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      return data as Brand[];
    },
  });

  // Fetch locations
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', selectedBrand],
    queryFn: async () => {
      let query = supabase
        .from('locations')
        .select(`
          *,
          brands:brand_id(display_name)
        `)
        .eq('is_active', true);

      if (selectedBrand !== 'all') {
        query = query.eq('brand_id', selectedBrand);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      return data as Location[];
    },
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    console.log('[SiteMaps] Map onLoad, setting map instance');
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Geocode a single location
  const geocodeLocation = async (location: Location): Promise<google.maps.LatLngLiteral | null> => {
    // Check if already geocoded in memory
    if (geocodedLocations.has(location.id)) {
      return geocodedLocations.get(location.id)!;
    }

    // Check if coordinates are stored in database
    if (location.latitude && location.longitude) {
      const coords = { lat: location.latitude, lng: location.longitude };
      setGeocodedLocations(prev => new Map(prev).set(location.id, coords));
      return coords;
    }

    // Only geocode if we don't have coordinates
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          address: location.address,
          city: location.city,
          state: location.state,
          zipCode: location.zip_code,
          locationId: location.id, // Pass locationId to save to database
        },
      });

      if (error) throw error;

      if (data && data.lat && data.lng) {
        const coords = { lat: data.lat, lng: data.lng };
        setGeocodedLocations(prev => new Map(prev).set(location.id, coords));
        return coords;
      }
    } catch (error) {
      console.error(`Failed to geocode location ${location.name}:`, error);
    }

    return null;
  };

  // Geocode only new locations and fit map bounds
  useEffect(() => {
    if (!locations || locations.length === 0 || !map) return;

    const geocodeNewAndFitBounds = async () => {
      setGeocoding(true);
      console.log('[SiteMaps] Start geocode/fitBounds. locations:', locations?.length || 0);
      let newGeocodedCount = 0;
      const bounds = new google.maps.LatLngBounds();
      
      // Geocode only locations without coordinates
      for (const location of locations) {
        const coords = await geocodeLocation(location);
        if (coords) {
          bounds.extend(coords);
          // Only count as new if it didn't have coordinates in database
          if (!location.latitude || !location.longitude) {
            newGeocodedCount++;
          }
        }
      }
      
      setGeocoding(false);
      console.log('[SiteMaps] Geocode done. New count:', newGeocodedCount, 'Bounds empty?', bounds.isEmpty());
      
      // Show toast only for newly geocoded locations
      if (newGeocodedCount > 0) {
        toast.success(`Geocoded ${newGeocodedCount} new location${newGeocodedCount > 1 ? 's' : ''}`);
      }
      
      // Fit map to show all markers
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
        // Add padding for better visualization
        const padding = { top: 50, right: 50, bottom: 50, left: 50 };
        map.fitBounds(bounds, padding);
        console.log('[SiteMaps] fitBounds applied with padding');
      } else {
        console.warn('[SiteMaps] No bounds to fit - no coords available');
      }
    };

    geocodeNewAndFitBounds();
  }, [locations, map]);

  // Get coordinates for a location
  const getCoordinatesForLocation = (location: Location): google.maps.LatLngLiteral | null => {
    // Try geocoded coordinates first
    if (geocodedLocations.has(location.id)) {
      return geocodedLocations.get(location.id)!;
    }
    
    // Try database coordinates
    if (location.latitude && location.longitude) {
      return { lat: location.latitude, lng: location.longitude };
    }
    
    return null;
  };


  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Site Maps</h1>
        <p className="text-muted-foreground mt-2">
          View all business locations on the map
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Map
              </CardTitle>
              <CardDescription>
                {selectedBrand === 'all' 
                  ? `Showing all ${locations?.length || 0} locations`
                  : `Showing ${locations?.length || 0} ${brands?.find(b => b.id === selectedBrand)?.display_name} locations`
                }
                {geocoding && ' (Geocoding addresses...)'}
              </CardDescription>
            </div>
            <div className="w-[200px]">
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands?.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {locationsLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !apiKey ? (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden border">
              <MapsLoader apiKey={apiKey} onLoaded={() => setMapsLoaded(true)}>
                {() => (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={defaultCenter}
                    zoom={4}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: true,
                      fullscreenControl: true,
                    }}
                  >
                    {locations?.map((location) => {
                      const coords = getCoordinatesForLocation(location);
                      if (!coords) return null;

                      return (
                        <Marker
                          key={location.id}
                          position={coords}
                          onClick={() => setSelectedLocation(location)}
                          title={location.name}
                        />
                      );
                    })}

                    {selectedLocation && (
                      <InfoWindow
                        position={getCoordinatesForLocation(selectedLocation)!}
                        onCloseClick={() => setSelectedLocation(null)}
                      >
                        <div className="p-2">
                          <h3 className="font-semibold text-sm mb-1">{selectedLocation.name}</h3>
                          {selectedLocation.brands && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {selectedLocation.brands.display_name}
                            </p>
                          )}
                          {selectedLocation.address && (
                            <p className="text-xs">{selectedLocation.address}</p>
                          )}
                          {(selectedLocation.city || selectedLocation.state || selectedLocation.zip_code) && (
                            <p className="text-xs">
                              {[selectedLocation.city, selectedLocation.state, selectedLocation.zip_code]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          )}
                          {selectedLocation.phone && (
                            <p className="text-xs mt-1">
                              <strong>Phone:</strong> {selectedLocation.phone}
                            </p>
                          )}
                          {selectedLocation.email && (
                            <p className="text-xs">
                              <strong>Email:</strong> {selectedLocation.email}
                            </p>
                          )}
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                )}
              </MapsLoader>
            </div>
          )}
        </CardContent>
      </Card>

      {mapsLoadTimedOut && !mapsLoaded && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Maps load timeout</AlertTitle>
          <AlertDescription>
            We couldn't load Google Maps. Check API key restrictions for this preview domain and ensure billing is enabled.
            Allowed referrer (add to key restrictions): {window.location.origin}
          </AlertDescription>
        </Alert>
      )}

      {geocoding && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Geocoding location addresses using Google Maps API...
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Locations are geocoded using Google's Geocoding API for accurate positioning on the map.
        </AlertDescription>
      </Alert>
    </div>
  );
}
