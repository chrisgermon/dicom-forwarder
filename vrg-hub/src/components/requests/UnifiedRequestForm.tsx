import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CCEmailsInput } from './CCEmailsInput';
import { DynamicFormRenderer } from '@/components/form-builder/DynamicFormRenderer';
import { FormTemplate } from '@/types/form-builder';

interface UnifiedRequestFormProps {
  requestTypeId: string;
  requestTypeName: string;
  departmentId?: string;
  formTemplateId?: string;
  categoryId?: string;
  categoryName?: string;
  assignedTo?: string;
}

export function UnifiedRequestForm({ 
  requestTypeId, 
  requestTypeName, 
  departmentId: _departmentId, 
  formTemplateId,
  categoryId,
  categoryName,
  assignedTo 
}: UnifiedRequestFormProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brandId, setBrandId] = useState(profile?.brand_id || '');
  const [locationId, setLocationId] = useState(profile?.location_id || '');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [brands, setBrands] = useState<Array<{ id: string; display_name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch form template if formTemplateId is provided
  useEffect(() => {
    const fetchFormTemplate = async () => {
      if (!formTemplateId) return;
      
      setLoadingTemplate(true);
      try {
        const { data, error } = await supabase
          .from('form_templates')
          .select('*')
          .eq('id', formTemplateId)
          .single();

        if (error) throw error;
        setFormTemplate(data as any);
      } catch (error) {
        console.error('Error fetching form template:', error);
        toast.error('Failed to load form template');
      } finally {
        setLoadingTemplate(false);
      }
    };

    fetchFormTemplate();
  }, [formTemplateId]);

  // Fetch default CC emails from request type and category
  useEffect(() => {
    const fetchDefaultCCEmails = async () => {
      try {
        const ccEmailsSet = new Set<string>();

        // Fetch CC emails from request type
        if (requestTypeId) {
          const { data: requestType } = await supabase
            .from('request_types')
            .select('cc_emails')
            .eq('id', requestTypeId)
            .single();

          if (requestType?.cc_emails) {
            requestType.cc_emails.forEach((email: string) => ccEmailsSet.add(email));
          }
        }

        // Fetch CC emails from category
        if (categoryId) {
          const { data: category } = await supabase
            .from('request_categories')
            .select('cc_emails')
            .eq('id', categoryId)
            .single();

          if (category?.cc_emails) {
            category.cc_emails.forEach((email: string) => ccEmailsSet.add(email));
          }
        }

        // Set initial CC emails from defaults
        if (ccEmailsSet.size > 0) {
          setCcEmails(Array.from(ccEmailsSet));
        }
      } catch (error) {
        console.error('Error fetching default CC emails:', error);
      }
    };

    fetchDefaultCCEmails();
  }, [requestTypeId, categoryId]);

  useEffect(() => {
    if (profile) {
      setBrandId(profile.brand_id || '');
      setLocationId(profile.location_id || '');
    }
  }, [profile]);

  // Fetch brands and locations
  useEffect(() => {
    const fetchBrandsAndLocations = async () => {
      try {
        const [brandsRes, locationsRes] = await Promise.all([
          supabase.from('brands').select('id, display_name').eq('is_active', true).order('sort_order'),
          supabase.from('locations').select('id, name').eq('is_active', true).order('sort_order')
        ]);

        if (brandsRes.data) setBrands(brandsRes.data);
        if (locationsRes.data) setLocations(locationsRes.data);
      } catch (error) {
        console.error('Error fetching brands/locations:', error);
      }
    };

    fetchBrandsAndLocations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to submit a request');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a request title');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter an issue description');
      return;
    }

    setLoading(true);

    try {
      // Upload attachments to storage if any
      const attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('request-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('request-attachments')
            .getPublicUrl(fileName);
            
          attachmentUrls.push(publicUrl);
        }
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: title.trim(),
          description: description.trim(),
          business_justification: description.trim(),
          priority: 'medium',
          status: 'open',
          user_id: user.id,
          brand_id: brandId || null,
          location_id: locationId || null,
          assigned_to: assignedTo || null,
          category_id: categoryId || null,
          form_template_id: formTemplateId || null,
          request_type_id: requestTypeId || null,
          metadata: {
            attachments: attachmentUrls,
            request_type: requestTypeName,
            category: categoryName
          },
          cc_emails: ccEmails,
          source: 'form',
        })
        .select('id, request_number')
        .single();

      if (error) throw error;

      // Send notification email
      await supabase.functions.invoke('notify-ticket-event', {
        body: {
          requestId: data.id,
          requestType: requestTypeId || 'hardware',
          eventType: 'created',
          actorId: user.id,
        },
      });

      // Send confirmation email to requester
      try {
        await supabase.functions.invoke('send-request-confirmation', {
          body: {
            ticketId: data.id,
            recipientEmail: profile?.email,
          },
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the request if email fails
      }

      toast.success(`Request #${data.request_number} submitted successfully!`);
      navigate('/requests');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleDynamicFormSubmit = async (formData: Record<string, any>) => {
    if (!user) {
      toast.error('You must be logged in to submit a request');
      return;
    }

    setLoading(true);

    try {
      // Upload attachments to storage if any
      const attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('request-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('request-attachments')
            .getPublicUrl(fileName);
            
          attachmentUrls.push(publicUrl);
        }
      }

      // Use first field value as title if available
      const firstFieldValue = Object.values(formData)[0];
      const requestTitle = typeof firstFieldValue === 'string' ? firstFieldValue : categoryName || requestTypeName;

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: requestTitle,
          description: JSON.stringify(formData, null, 2),
          business_justification: JSON.stringify(formData, null, 2),
          priority: 'medium',
          status: 'open',
          user_id: user.id,
          brand_id: brandId || null,
          location_id: locationId || null,
          assigned_to: assignedTo || null,
          category_id: categoryId || null,
          form_template_id: formTemplateId || null,
          request_type_id: requestTypeId || null,
          metadata: {
            form_data: formData,
            attachments: attachmentUrls,
            request_type: requestTypeName,
            category: categoryName
          },
          cc_emails: ccEmails,
          source: 'form',
        })
        .select('id, request_number')
        .single();

      if (error) throw error;

      // Send notification email
      await supabase.functions.invoke('notify-ticket-event', {
        body: {
          requestId: data.id,
          requestType: requestTypeId || 'hardware',
          eventType: 'created',
          actorId: user.id,
        },
      });

      // Send confirmation email to requester
      try {
        await supabase.functions.invoke('send-request-confirmation', {
          body: {
            ticketId: data.id,
            recipientEmail: profile?.email,
          },
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the request if email fails
      }

      toast.success(`Request #${data.request_number} submitted successfully!`);
      navigate('/requests');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // If we have a form template with custom fields, use the dynamic renderer
  if (formTemplate && formTemplate.fields && formTemplate.fields.length > 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{requestTypeName}{categoryName ? ` - ${categoryName}` : ''}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company and Location - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Company</Label>
                <select
                  id="brand"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={loading}
                >
                  <option value="">Select Company</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.display_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <select
                  id="location"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={loading}
                >
                  <option value="">Select Location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Form Fields */}
            <DynamicFormRenderer 
              template={formTemplate}
              onSubmit={handleDynamicFormSubmit}
              isSubmitting={loading}
            />

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments (optional)</Label>
              <FileDropzone
                onFilesSelected={setAttachments}
                multiple={true}
                maxSize={10}
              />
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="text-sm text-muted-foreground flex items-center justify-between bg-muted px-3 py-2 rounded">
                      <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CC Emails */}
            <div className="space-y-2">
              <CCEmailsInput
                emails={ccEmails}
                onChange={setCcEmails}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default form without custom fields
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{requestTypeName}{categoryName ? ` - ${categoryName}` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Request Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Request Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a brief title for your request"
                required
                disabled={loading}
              />
            </div>

            {/* Issue Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Issue Description *</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Describe the issue in detail..."
                disabled={loading}
              />
            </div>

            {/* Company and Location - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Company</Label>
                <select
                  id="brand"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={loading}
                >
                  <option value="">Select Company</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.display_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <select
                  id="location"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={loading}
                >
                  <option value="">Select Location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <FileDropzone
                onFilesSelected={setAttachments}
                multiple={true}
                maxSize={10}
              />
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="text-sm text-muted-foreground flex items-center justify-between bg-muted px-3 py-2 rounded">
                      <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CC Emails */}
            <div className="space-y-2">
              <CCEmailsInput
                emails={ccEmails}
                onChange={setCcEmails}
                disabled={loading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/requests/new')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}