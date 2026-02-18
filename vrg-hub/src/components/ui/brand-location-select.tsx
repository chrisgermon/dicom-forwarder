import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Company {
  id: string;
  display_name: string;
}

interface Location {
  id: string;
  name: string;
  brand_id: string;
}

interface BrandLocationSelectProps {
  selectedBrandId?: string;
  selectedLocationId?: string;
  onBrandChange: (brandId: string) => void;
  onLocationChange: (locationId: string) => void;
  required?: boolean;
}

export function BrandLocationSelect({
  selectedBrandId,
  selectedLocationId,
  onBrandChange,
  onLocationChange,
  required = false,
}: BrandLocationSelectProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  // Load locations when brand is selected - include initial load
  useEffect(() => {
    if (selectedBrandId) {
      loadLocations(selectedBrandId);
    } else {
      setLocations([]);
    }
  }, [selectedBrandId]);

  // Also load locations on mount if we already have a selected brand
  useEffect(() => {
    if (selectedBrandId && locations.length === 0 && !loadingLocations) {
      loadLocations(selectedBrandId);
    }
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, display_name')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadLocations = async (brandId: string) => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, brand_id')
        .eq('brand_id', brandId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleBrandChange = (brandId: string) => {
    onBrandChange(brandId);
    onLocationChange(''); // Reset location when company changes
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="brand">Company {required && '*'}</Label>
        <Select
          value={selectedBrandId && selectedBrandId.length > 0 ? selectedBrandId : undefined}
          onValueChange={handleBrandChange}
          disabled={loadingCompanies}
          required={required}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a company" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBrandId && (
        <div className="space-y-2">
          <Label htmlFor="location">Location {required && '*'}</Label>
          <Select
            value={selectedLocationId && selectedLocationId.length > 0 ? selectedLocationId : undefined}
            onValueChange={onLocationChange}
            disabled={loadingLocations}
            required={required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {locations.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No locations available for this company
                </div>
              ) : (
                locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
