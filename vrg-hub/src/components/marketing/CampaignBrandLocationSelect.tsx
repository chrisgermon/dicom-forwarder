import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  display_name: string;
}

interface Location {
  id: string;
  name: string;
  brand_id: string;
}

interface CampaignBrandLocationSelectProps {
  campaignId: string;
  campaignType: 'email' | 'fax';
  currentBrandId?: string | null;
  currentLocationId?: string | null;
  onUpdate?: () => void;
}

export const CampaignBrandLocationSelect = ({ 
  campaignId, 
  campaignType, 
  currentBrandId, 
  currentLocationId,
  onUpdate 
}: CampaignBrandLocationSelectProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(currentBrandId || undefined);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(currentLocationId || undefined);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadLocations(selectedBrandId);
    } else {
      setLocations([]);
      setSelectedLocationId(undefined);
    }
  }, [selectedBrandId]);

  const loadCompanies = async () => {
    const { data, error } = await supabase
      .from('brands')
      .select('id, name, display_name')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error loading companies:', error);
      return;
    }

    setCompanies(data || []);
  };

  const loadLocations = async (brandId: string) => {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, brand_id')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error loading locations:', error);
      return;
    }

    setLocations(data || []);
  };

  const handleBrandChange = async (brandId: string) => {
    setSelectedBrandId(brandId);
    setSelectedLocationId(undefined);
    await saveAssignment(brandId, null);
  };

  const handleLocationChange = async (locationId: string) => {
    setSelectedLocationId(locationId);
    await saveAssignment(selectedBrandId || null, locationId);
  };

  const saveAssignment = async (brandId: string | null, locationId: string | null) => {
    try {
      if (campaignType === 'email') {
        // Upsert email campaign assignment
        const { error } = await supabase
          .from('mailchimp_campaign_assignments')
          .upsert({
            campaign_id: campaignId,
            brand_id: brandId,
            location_id: locationId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'campaign_id'
          });

        if (error) throw error;
      } else {
        // Update fax campaign
        const { error } = await supabase
          .from('notifyre_fax_campaigns')
          .update({
            brand_id: brandId,
            location_id: locationId
          })
          .eq('id', campaignId);

        if (error) throw error;
      }

      toast.success("Assignment updated");
      onUpdate?.();
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast.error("Failed to save assignment");
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={selectedBrandId} onValueChange={handleBrandChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No company</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={selectedLocationId} 
        onValueChange={handleLocationChange}
        disabled={!selectedBrandId || selectedBrandId === 'none'}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No location</SelectItem>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};