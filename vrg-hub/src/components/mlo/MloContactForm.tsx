import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateMloContact, useUpdateMloContact, type MloContact } from "@/hooks/useMloCrm";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Search, X, Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ClinicOption {
  clinic_key: number;
  clinic_name: string;
  suburb: string | null;
  state: string | null;
}

const formSchema = z.object({
  contact_type: z.enum(['clinic', 'referrer', 'practice_manager', 'other']),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  preferred_contact_method: z.enum(['email', 'phone', 'mobile', 'in_person']).optional(),
  notes: z.string().optional(),
  is_key_decision_maker: z.boolean().default(false),
  clinic_key: z.number().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MloContactFormProps {
  contact?: MloContact;
  onSuccess: () => void;
}

export function MloContactForm({ contact, onSuccess }: MloContactFormProps) {
  const createContact = useCreateMloContact();
  const updateContact = useUpdateMloContact();
  const isEditing = !!contact;

  const [clinicSearch, setClinicSearch] = useState('');
  const [clinicOptions, setClinicOptions] = useState<ClinicOption[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<ClinicOption | null>(null);
  const [clinicPopoverOpen, setClinicPopoverOpen] = useState(false);
  const [isLoadingClinics, setIsLoadingClinics] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contact_type: contact?.contact_type || 'referrer',
      first_name: contact?.first_name || '',
      last_name: contact?.last_name || '',
      title: contact?.title || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      mobile: contact?.mobile || '',
      preferred_contact_method: contact?.preferred_contact_method || undefined,
      notes: contact?.notes || '',
      is_key_decision_maker: contact?.is_key_decision_maker || false,
      clinic_key: contact?.clinic_key || null,
    },
  });

  // Load existing clinic if editing
  useEffect(() => {
    if (contact?.clinic_key) {
      supabase
        .from('clinic_directory')
        .select('clinic_key, clinic_name, suburb, state')
        .eq('clinic_key', contact.clinic_key)
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) {
            setSelectedClinic(data);
          }
        });
    }
  }, [contact?.clinic_key]);

  // Search clinics
  useEffect(() => {
    if (clinicSearch.length < 2) {
      setClinicOptions([]);
      return;
    }

    const searchClinics = async () => {
      setIsLoadingClinics(true);
      const searchTerm = `%${clinicSearch}%`;
      
      const { data, error } = await supabase
        .from('clinic_directory')
        .select('clinic_key, clinic_name, suburb, state')
        .ilike('clinic_name', searchTerm)
        .order('clinic_name')
        .limit(20);

      if (!error && data) {
        setClinicOptions(data);
      }
      setIsLoadingClinics(false);
    };

    const debounce = setTimeout(searchClinics, 300);
    return () => clearTimeout(debounce);
  }, [clinicSearch]);

  const handleSelectClinic = (clinic: ClinicOption) => {
    setSelectedClinic(clinic);
    form.setValue('clinic_key', clinic.clinic_key);
    setClinicPopoverOpen(false);
    setClinicSearch('');
  };

  const handleClearClinic = () => {
    setSelectedClinic(null);
    form.setValue('clinic_key', null);
  };

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await updateContact.mutateAsync({ id: contact.id, ...data });
    } else {
      await createContact.mutateAsync(data as any);
    }
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Linked Clinic */}
        <div className="space-y-2">
          <FormLabel>Linked Clinic (from Referrer Directory)</FormLabel>
          {selectedClinic ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedClinic.clinic_name}</p>
                {(selectedClinic.suburb || selectedClinic.state) && (
                  <p className="text-sm text-muted-foreground truncate">
                    {[selectedClinic.suburb, selectedClinic.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearClinic}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Popover open={clinicPopoverOpen} onOpenChange={setClinicPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-muted-foreground"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search for a clinic...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Type clinic name..."
                    value={clinicSearch}
                    onValueChange={setClinicSearch}
                  />
                  <CommandList>
                    {isLoadingClinics && (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Searching...
                      </div>
                    )}
                    {!isLoadingClinics && clinicSearch.length >= 2 && clinicOptions.length === 0 && (
                      <CommandEmpty>No clinics found.</CommandEmpty>
                    )}
                    {!isLoadingClinics && clinicSearch.length < 2 && (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Type at least 2 characters to search
                      </div>
                    )}
                    <CommandGroup>
                      {clinicOptions.map((clinic) => (
                        <CommandItem
                          key={clinic.clinic_key}
                          value={String(clinic.clinic_key)}
                          onSelect={() => handleSelectClinic(clinic)}
                          className="cursor-pointer"
                        >
                          <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{clinic.clinic_name}</p>
                            {(clinic.suburb || clinic.state) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {[clinic.suburb, clinic.state].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="first_name" render={({ field }) => (
            <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="last_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="contact_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="referrer">Referrer</SelectItem>
                  <SelectItem value="practice_manager">Practice Manager</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>Title/Role</FormLabel>
              <FormControl><Input {...field} placeholder="e.g. GP, Specialist" /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl><Input {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea {...field} rows={3} /></FormControl>
          </FormItem>
        )} />

        <FormField control={form.control} name="is_key_decision_maker" render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="!mt-0">Key Decision Maker</FormLabel>
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={createContact.isPending || updateContact.isPending}>
            {(createContact.isPending || updateContact.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {createContact.isPending || updateContact.isPending
              ? 'Saving...'
              : isEditing ? 'Update Contact' : 'Create Contact'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
