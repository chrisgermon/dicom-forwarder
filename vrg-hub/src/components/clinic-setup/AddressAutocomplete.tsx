import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY, isGoogleMapsConfigured } from "@/lib/googleMapsConfig";

const libraries: ("places")[] = ["places"];

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing to search for an address...",
  disabled = false,
  className,
}: AddressAutocompleteProps) {
  const [isManualMode, setIsManualMode] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const apiKey = GOOGLE_MAPS_API_KEY;
  const hasApiKey = isGoogleMapsConfigured();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  // Sync input value with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || isManualMode || !hasApiKey) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "au" },
      fields: ["formatted_address", "address_components", "geometry"],
      types: ["address"],
    });

    autocomplete.addListener("place_changed", () => {
      setIsSearching(false);
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        const formattedAddress = place.formatted_address;
        setInputValue(formattedAddress);
        onChange(formattedAddress);
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, isManualMode, hasApiKey, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsSearching(newValue.length > 2);
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleBlur = () => {
    // Save the current value if user leaves without selecting from dropdown
    setTimeout(() => {
      setIsSearching(false);
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, 200);
  };

  const toggleMode = () => {
    setIsManualMode(!isManualMode);
    if (!isManualMode) {
      // Switching to manual mode - save current value
      onChange(inputValue);
    }
  };

  // If API key not configured or error loading, show manual entry only
  if (!hasApiKey || loadError) {
    return (
      <div className="space-y-2">
        <Textarea
          value={inputValue}
          onChange={handleManualChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("min-h-[60px] text-sm", className)}
        />
        {!hasApiKey && (
          <p className="text-xs text-muted-foreground">
            Address search not available. Enter address manually.
          </p>
        )}
      </div>
    );
  }

  // Show loading state while Google Maps loads
  if (!isLoaded) {
    return (
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Loading address search..."
          disabled
          className={cn("pr-20", className)}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isManualMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Pencil className="h-3 w-3" />
            Manual entry mode
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleMode}
            disabled={disabled}
            className="h-6 text-xs gap-1"
          >
            <Search className="h-3 w-3" />
            Use search
          </Button>
        </div>
        <Textarea
          value={inputValue}
          onChange={handleManualChange}
          placeholder="Enter the full address manually..."
          disabled={disabled}
          className={cn("min-h-[60px] text-sm", className)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-8 pr-24", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleMode}
          disabled={disabled}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
          Manual
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Start typing to search, or click "Manual" to enter the address yourself.
      </p>
    </div>
  );
}
