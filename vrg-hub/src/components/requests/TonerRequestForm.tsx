import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BrandLocationSelect } from '@/components/ui/brand-location-select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const tonerColors = [
  { id: 'black', label: 'Black' },
  { id: 'cyan', label: 'Cyan' },
  { id: 'magenta', label: 'Magenta' },
  { id: 'yellow', label: 'Yellow' },
];

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  printer_model: z.string().min(1, 'Printer model is required'),
  toner_type: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1').max(100),
  colors_required: z.array(z.string()).min(1, 'Select at least one color'),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']),
  site: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TonerRequestForm() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brandId, setBrandId] = useState(profile?.brand_id || '');
  const [locationId, setLocationId] = useState(profile?.location_id || '');

  // Update when profile loads
  useEffect(() => {
    if (profile?.brand_id && !brandId) {
      setBrandId(profile.brand_id);
      setLocationId(profile.location_id || '');
    }
  }, [profile]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      printer_model: '',
      toner_type: '',
      quantity: 1,
      colors_required: [],
      urgency: 'normal',
      site: '',
      description: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error('You must be logged in to submit a request');
      return;
    }

    if (!brandId || !locationId) {
      toast.error('Please select a brand and location');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: tonerRequest, error } = await supabase
        .from('toner_requests')
        .insert({
          user_id: user.id,
          brand_id: brandId,
          location_id: locationId,
          title: values.title,
          printer_model: values.printer_model,
          toner_type: values.toner_type || null,
          quantity: values.quantity,
          colors_required: values.colors_required,
          urgency: values.urgency,
          site: values.site || null,
          description: values.description || null,
          status: 'open',
          priority: values.urgency === 'urgent' ? 'high' : values.urgency === 'high' ? 'medium' : 'low',
        })
        .select()
        .single();

      if (error || !tonerRequest) throw error;

      // Send notification email
      await supabase.functions.invoke('notify-ticket-event', {
        body: {
          requestId: tonerRequest.id,
          requestType: 'hardware',
          eventType: 'created',
          actorId: user.id,
        },
      });

      toast.success('Toner request submitted successfully');
      navigate('/requests');
    } catch (error) {
      console.error('Error submitting toner request:', error);
      toast.error('Failed to submit toner request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toner Order Request</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <BrandLocationSelect
              selectedBrandId={brandId}
              selectedLocationId={locationId}
              onBrandChange={setBrandId}
              onLocationChange={setLocationId}
              required
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Toner cartridge for HP LaserJet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="printer_model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Printer Model *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., HP LaserJet Pro M404dn" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toner_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Toner Type/Part Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., CF259A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="colors_required"
              render={() => (
                <FormItem>
                  <FormLabel>Colors Required *</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {tonerColors.map((color) => (
                      <FormField
                        key={color.id}
                        control={form.control}
                        name="colors_required"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(color.id)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, color.id]);
                                  } else {
                                    field.onChange(current.filter((v) => v !== color.id));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {color.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="site"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site/Room Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Building A, Room 205" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about this toner request..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/requests')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
