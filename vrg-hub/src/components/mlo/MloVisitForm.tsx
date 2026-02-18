import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, Search, Loader2 } from "lucide-react";
import { AddressAutocomplete } from "@/components/clinic-setup/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCreateMloVisit, useUpdateMloVisit, MloVisit, MloVisitInput } from "@/hooks/useMloData";
import { useReferrerSearch } from "@/hooks/useReferrerSearch";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const visitFormSchema = z.object({
  visit_date: z.date({ required_error: "Visit date is required" }),
  visit_time: z.string().optional().nullable(),
  visit_type: z.enum(['site_visit', 'phone_call', 'video_call', 'email', 'event', 'other'], {
    required_error: "Visit type is required",
  }),
  location_id: z.string().optional().nullable(),
  clinic_key: z.number().optional().nullable(),
  referrer_key: z.number().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_role: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  outcome: z.enum(['positive', 'neutral', 'follow_up_required', 'issue_raised', 'no_contact']).optional().nullable(),
  notes: z.string().optional().nullable(),
  follow_up_date: z.date().optional().nullable(),
  follow_up_time: z.string().optional().nullable(),
  follow_up_location: z.string().optional().nullable(),
  follow_up_notes: z.string().optional().nullable(),
});

type VisitFormValues = z.infer<typeof visitFormSchema>;

interface MloVisitFormProps {
  visit?: MloVisit;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const VISIT_TYPES = [
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'video_call', label: 'Video Call' },
  { value: 'email', label: 'Email' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const OUTCOMES = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'follow_up_required', label: 'Follow-up Required' },
  { value: 'issue_raised', label: 'Issue Raised' },
  { value: 'no_contact', label: 'No Contact' },
];

export function MloVisitForm({ visit, onSuccess, onCancel }: MloVisitFormProps) {
  const { profile } = useAuth();
  const createVisit = useCreateMloVisit();
  const updateVisit = useUpdateMloVisit();
  
  // Fetch locations based on user's brand_id from their profile
  const { data: locations = [] } = useQuery({
    queryKey: ['mlo-form-locations', profile?.brand_id],
    queryFn: async () => {
      if (!profile?.brand_id) return [];
      
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, brand_id, brand:brands(display_name)')
        .eq('brand_id', profile.brand_id)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.brand_id,
  });
  
  const [showReferrerSearch, setShowReferrerSearch] = useState(false);
  const { 
    searchTerm, 
    setSearchTerm, 
    searchType, 
    setSearchType,
    referrerResults, 
    clinicResults, 
    loading: searchLoading 
  } = useReferrerSearch();

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: visit ? {
      visit_date: new Date(visit.visit_date),
      visit_time: visit.visit_time || null,
      visit_type: visit.visit_type,
      location_id: visit.location_id,
      clinic_key: visit.clinic_key,
      referrer_key: visit.referrer_key,
      contact_name: visit.contact_name,
      contact_role: visit.contact_role,
      purpose: visit.purpose,
      outcome: visit.outcome,
      notes: visit.notes,
      follow_up_date: visit.follow_up_date ? new Date(visit.follow_up_date) : null,
      follow_up_time: visit.follow_up_time || null,
      follow_up_location: visit.follow_up_location || null,
      follow_up_notes: visit.follow_up_notes,
    } : {
      visit_date: new Date(),
      visit_time: '09:00',
      visit_type: 'site_visit',
    },
  });

  const onSubmit = async (values: VisitFormValues) => {
    const input: MloVisitInput = {
      visit_date: format(values.visit_date, 'yyyy-MM-dd'),
      visit_time: values.visit_time || null,
      visit_type: values.visit_type,
      location_id: values.location_id || null,
      clinic_key: values.clinic_key || null,
      referrer_key: values.referrer_key || null,
      contact_name: values.contact_name || null,
      contact_role: values.contact_role || null,
      purpose: values.purpose || null,
      outcome: values.outcome || null,
      notes: values.notes || null,
      follow_up_date: values.follow_up_date ? format(values.follow_up_date, 'yyyy-MM-dd') : null,
      follow_up_time: values.follow_up_time || null,
      follow_up_location: values.follow_up_location || null,
      follow_up_notes: values.follow_up_notes || null,
    };

    try {
      if (visit) {
        await updateVisit.mutateAsync({ id: visit.id, ...input });
      } else {
        await createVisit.mutateAsync(input);
      }
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const selectedClinic = clinicResults.find(c => c.clinic_key === form.watch('clinic_key'));
  const selectedReferrer = referrerResults.find(r => r.referrer_key === form.watch('referrer_key'));
  
  const watchedClinicKey = form.watch('clinic_key');
  const watchedReferrerKey = form.watch('referrer_key');

  // Build default address from selected referrer/clinic
  const getDefaultAddress = (): string => {
    // First check if referrer has clinic address
    if (selectedReferrer) {
      const parts = [
        selectedReferrer.clinic_address,
        selectedReferrer.suburb,
        selectedReferrer.state,
        selectedReferrer.clinic_postcode
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    
    // Then check clinic address
    if (selectedClinic) {
      const parts = [
        selectedClinic.address,
        selectedClinic.suburb,
        selectedClinic.state,
        selectedClinic.postcode
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    
    return '';
  };

  // Auto-populate follow-up location when referrer/clinic is selected (only if empty)
  useEffect(() => {
    const currentLocation = form.getValues('follow_up_location');
    if (!currentLocation) {
      const defaultAddress = getDefaultAddress();
      if (defaultAddress) {
        form.setValue('follow_up_location', defaultAddress);
      }
    }
  }, [watchedClinicKey, watchedReferrerKey, selectedClinic, selectedReferrer]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Visit Date */}
          <FormField
            control={form.control}
            name="visit_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Visit Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Visit Time */}
          <FormField
            control={form.control}
            name="visit_time"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Time</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="pl-9"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Visit Type */}
          <FormField
            control={form.control}
            name="visit_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visit Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VISIT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location (Worksite) */}
        <FormField
          control={form.control}
          name="location_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Worksite</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select worksite" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                      {location.brand && ` (${location.brand.display_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Clinic/Referrer Search */}
        <div className="space-y-2">
          <FormLabel>Client (Clinic/Referrer)</FormLabel>
          <div className="flex gap-2">
            <Select value={searchType} onValueChange={(v) => setSearchType(v as 'referrer' | 'clinic')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clinic">Clinic</SelectItem>
                <SelectItem value="referrer">Referrer</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${searchType}s...`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowReferrerSearch(true);
                }}
                onFocus={() => setShowReferrerSearch(true)}
                className="pl-9"
              />
            </div>
          </div>
          
          {/* Search Results */}
          {showReferrerSearch && searchTerm && (
            <div className="border rounded-md max-h-48 overflow-y-auto bg-background">
              {searchLoading ? (
                <div className="p-3 text-sm text-muted-foreground">Searching...</div>
              ) : searchType === 'clinic' ? (
                clinicResults.length > 0 ? (
                  clinicResults.map((clinic) => (
                    <button
                      key={clinic.clinic_key}
                      type="button"
                      className="w-full p-3 text-left hover:bg-muted border-b last:border-0"
                      onClick={() => {
                        form.setValue('clinic_key', clinic.clinic_key);
                        form.setValue('referrer_key', null);
                        form.setValue('contact_name', clinic.clinic_name);
                        setShowReferrerSearch(false);
                        setSearchTerm('');
                      }}
                    >
                      <div className="font-medium">{clinic.clinic_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {clinic.suburb}, {clinic.state} • {clinic.referrer_count} referrers
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">No clinics found</div>
                )
              ) : referrerResults.length > 0 ? (
                referrerResults.map((referrer) => (
                  <button
                    key={referrer.referrer_key}
                    type="button"
                    className="w-full p-3 text-left hover:bg-muted border-b last:border-0"
                    onClick={() => {
                      form.setValue('referrer_key', referrer.referrer_key);
                      form.setValue('clinic_key', referrer.clinic_key || null);
                      form.setValue('contact_name', referrer.referrer_name);
                      form.setValue('contact_role', referrer.provider_number || null);
                      setShowReferrerSearch(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="font-medium">{referrer.referrer_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {referrer.provider_number || 'Provider'} • {referrer.clinic_name || 'No clinic'}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-sm text-muted-foreground">No referrers found</div>
              )}
            </div>
          )}

          {/* Selected Client Display */}
          {(selectedClinic || selectedReferrer || form.watch('contact_name')) && (
            <div className="p-2 bg-muted rounded-md text-sm">
              Selected: <span className="font-medium">{form.watch('contact_name')}</span>
              {form.watch('contact_role') && ` (${form.watch('contact_role')})`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact Name */}
          <FormField
            control={form.control}
            name="contact_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="Contact person name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Contact Role */}
          <FormField
            control={form.control}
            name="contact_role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Role</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="e.g. Practice Manager" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Purpose */}
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ''} placeholder="Purpose of the visit..." rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Outcome */}
        <FormField
          control={form.control}
          name="outcome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outcome</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {OUTCOMES.map((outcome) => (
                    <SelectItem key={outcome.value} value={outcome.value}>
                      {outcome.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ''} placeholder="Additional notes..." rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Follow-up Section */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-3">Follow-up (for calendar sync)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="follow_up_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Follow-up Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>No follow-up</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={(date) => {
                          field.onChange(date);
                          // Auto-set a default time if date is selected and no time set
                          if (date && !form.getValues('follow_up_time')) {
                            form.setValue('follow_up_time', '09:00');
                          }
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="follow_up_time"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Follow-up Time</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="pl-9"
                        disabled={!form.watch('follow_up_date')}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="follow_up_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Notes</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="What to follow up on..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Follow-up Location with Google Autocomplete */}
          <FormField
            control={form.control}
            name="follow_up_location"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel>Follow-up Location</FormLabel>
                <FormControl>
                  <AddressAutocomplete
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Search for address or enter manually..."
                    disabled={!form.watch('follow_up_date')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={createVisit.isPending || updateVisit.isPending}
          >
            {(createVisit.isPending || updateVisit.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {createVisit.isPending || updateVisit.isPending
              ? 'Saving...'
              : visit ? 'Update Visit' : 'Log Visit'
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
