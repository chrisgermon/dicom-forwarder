import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// Label imported via RadioGroup
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  display_name: string;
  logo_url: string | null;
}

interface Location {
  id: string;
  name: string;
  brand_id: string;
}

export function FirstTimeSetupDialog() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"company" | "location">("company");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    // Show dialog if user is logged in but hasn't set company/location
    if (user && profile && !profile.brand_id) {
      setOpen(true);
      loadCompanies();
    }
  }, [user, profile]);

  useEffect(() => {
    if (selectedBrandId && step === "location") {
      loadLocations(selectedBrandId);
    }
  }, [selectedBrandId, step]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id, display_name, logo_url")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadLocations = async (brandId: string) => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, brand_id")
        .eq("brand_id", brandId)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error loading locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
  };

  const handleNextToLocation = () => {
    if (!selectedBrandId) {
      toast({
        title: "Please select a company",
        description: "You must select a company to continue",
        variant: "destructive",
      });
      return;
    }
    setStep("location");
  };

  const handleSubmit = async () => {
    if (!selectedLocationId) {
      toast({
        title: "Please select a location",
        description: "You must select a location to continue",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          brand_id: selectedBrandId,
          location_id: selectedLocationId,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Setup complete",
        description: "Your profile has been configured successfully.",
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        // Don't allow closing without completing setup
        if (profile?.brand_id) {
          setOpen(value);
        }
      }}
    >
      <DialogContent
        className={cn(
          step === "location" ? "sm:max-w-[900px]" : "sm:max-w-[600px]",
          "max-h-[90vh] overflow-hidden flex flex-col"
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {step === "company" ? "Select Your Company" : "Select Your Location"}
          </DialogTitle>
          <DialogDescription>
            {step === "company"
              ? "Choose your primary company to get started."
              : "Choose your primary location within the selected company."}
          </DialogDescription>
        </DialogHeader>

        {step === "company" ? (
          <div className="space-y-6">
            {loadingCompanies ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleBrandSelect(company.id)}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:border-primary/50",
                      selectedBrandId === company.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    )}
                  >
                    {selectedBrandId === company.id && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.display_name}
                        className="h-16 w-auto object-contain mb-3"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center mb-3">
                        <span className="text-2xl font-bold text-muted-foreground">
                          {company.display_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-center">
                      {company.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleNextToLocation}
                disabled={!selectedBrandId || loadingCompanies}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {loadingLocations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                  <RadioGroup
                    value={selectedLocationId}
                    onValueChange={setSelectedLocationId}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                  >
                    {locations.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        No locations available for this company
                      </div>
                    ) : (
                      locations.map((location) => (
                        <label
                          key={location.id}
                          htmlFor={location.id}
                          className={cn(
                            "relative flex items-center justify-center p-5 rounded-lg border-2 transition-all cursor-pointer min-h-[80px]",
                            selectedLocationId === location.id
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                          )}
                        >
                          {selectedLocationId === location.id && (
                            <div className="absolute top-2 right-2">
                              <Check className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <RadioGroupItem
                            value={location.id}
                            id={location.id}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium text-center px-2">
                            {location.name}
                          </span>
                        </label>
                      ))
                    )}
                  </RadioGroup>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep("company")}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !selectedLocationId}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Complete Setup
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
