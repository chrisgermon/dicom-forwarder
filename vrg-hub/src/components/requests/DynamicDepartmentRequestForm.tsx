import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BrandLocationSelect } from '@/components/ui/brand-location-select';
import { FileDropzone, FileList } from '@/components/ui/file-dropzone';

interface FieldOption {
  label: string;
  value: string;
}

interface Field {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[] | FieldOption[];
}

interface FormTemplate {
  id: string;
  name: string;
  fields: Field[];
  description?: string;
  settings?: {
    notification_user_ids?: string[];
    notification_level?: 'all' | 'new_only' | 'updates_only';
    enable_sms_notifications?: boolean;
    category_slug?: string;
  };
}

interface DynamicDepartmentRequestFormProps {
  department: string;
  departmentLabel: string;
  subDepartment?: string;
}

export function DynamicDepartmentRequestForm({
  department,
  departmentLabel,
  subDepartment,
}: DynamicDepartmentRequestFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<File[]>([]);
  const { user, profile, userRole } = useAuth();
  const [brandId, setBrandId] = useState(profile?.brand_id || '');
  const [locationId, setLocationId] = useState(profile?.location_id || '');
  const navigate = useNavigate();

  const isSuperAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';

  // Update when profile loads
  useEffect(() => {
    if (profile?.brand_id && !brandId) {
      setBrandId(profile.brand_id);
      setLocationId(profile.location_id || '');
    }
  }, [profile]);

  useEffect(() => {
    loadTemplate();
  }, [department, subDepartment]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      
      // Load form template through the category relationship
      const { data: categories, error: catError } = await supabase
        .from('request_categories')
        .select(`
          *,
          form_templates (*)
        `)
        .eq('is_active', true)
        .eq('name', department)
        .single();

      if (catError) throw catError;

      if (categories?.form_templates) {
        const templateData: FormTemplate = {
          ...(categories.form_templates as any),
          fields: (categories.form_templates as any).fields as Field[],
          settings: (categories.form_templates as any).settings as any,
        };
        setTemplate(templateData);
      } else {
        throw new Error('No form template found for this category');
      }
    } catch (error) {
      console.error('Error loading form template:', error);
      toast.error('Failed to load form template');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleEditForm = () => {
    if (template?.id) {
      navigate(`/form-templates?edit=${template.id}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to submit a request');
      return;
    }

    if (!template) {
      toast.error('Form template not loaded');
      return;
    }

    // Validate required fields
    const missingFields = template.fields
      .filter(field => field.required && !formData[field.id])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    setSubmitting(true);

    try {
      // Create a title from the form data
      const titleField = template.fields.find(f => 
        f.id.includes('title') || 
        f.id.includes('name') || 
        f.id === 'request_type' ||
        f.id === 'service_type' ||
        f.id === 'request_category'
      );
      
      const title = titleField 
        ? `${departmentLabel}: ${formData[titleField.id]}`
        : `${departmentLabel} Request`;

      // Combine all form data into description
      const descriptionParts = template.fields
        .filter(field => formData[field.id])
        .map(field => `${field.label}: ${formData[field.id]}`);

      const { data: request, error } = await supabase
        .from('hardware_requests')
        .insert({
          title,
          description: descriptionParts.join('\n'),
          business_justification: JSON.stringify({
            department,
            sub_department: subDepartment,
            category_slug: template.settings?.category_slug,
            form_data: formData,
          }),
          user_id: user.id,
          brand_id: brandId || null,
          location_id: locationId || null,
          status: 'open',
          priority: formData.priority || formData.urgency || 'medium',
          currency: 'AUD',
        })
        .select()
        .single();

      if (error || !request) throw error;

      // Send notification email
      await supabase.functions.invoke('notify-ticket-event', {
        body: {
          requestId: request.id,
          requestType: 'hardware',
          eventType: 'created',
          actorId: user.id,
        },
      });

      // Upload files if any
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${request.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('request-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;
          return fileName;
        });

        await Promise.all(uploadPromises);
      }

      // Send notifications - always invoke to ensure emails are sent
      const notificationUserIds = template.settings?.notification_user_ids;
      console.log('Sending notifications for new request:', request.id, 'with notification users:', notificationUserIds);
      await supabase.functions.invoke('notify-department-request', {
        body: {
          requestId: request.id,
          action: 'submitted',
          notificationUserIds: notificationUserIds || [],
        },
      });

      toast.success('Your request has been submitted successfully');
      navigate(`/requests/${request.id}`);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: Field) => {
    const isFullWidth = field.type === 'textarea';
    const baseClasses = isFullWidth ? "col-span-full" : "col-span-full md:col-span-1";

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={field.id} className={`space-y-2 ${baseClasses}`}>
            <Label htmlFor={field.id}>
              {field.label} {field.required && '*'}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className={`space-y-2 ${baseClasses}`}>
            <Label htmlFor={field.id}>
              {field.label} {field.required && '*'}
            </Label>
            <Textarea
              id={field.id}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              required={field.required}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className={`space-y-2 ${baseClasses}`}>
            <Label htmlFor={field.id}>
              {field.label} {field.required && '*'}
            </Label>
            <Select
              value={formData[field.id] || ''}
              onValueChange={(value) => handleFieldChange(field.id, value)}
              required={field.required}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => {
                  const optionValue = typeof option === 'string' ? option : option.value;
                  const optionLabel = typeof option === 'string' ? option : option.label;
                  return (
                    <SelectItem key={optionValue} value={optionValue}>
                      {optionLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className={`space-y-2 ${baseClasses}`}>
            <Label htmlFor={field.id}>
              {field.label} {field.required && '*'}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Form template not found. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{template.name}</CardTitle>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
            )}
          </div>
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditForm}
              className="ml-4"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Form
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BrandLocationSelect
              selectedBrandId={brandId}
              selectedLocationId={locationId}
              onBrandChange={setBrandId}
              onLocationChange={setLocationId}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {template.fields.map(renderField)}
          </div>

          <div className="space-y-4">
            <FileDropzone
              onFilesSelected={(newFiles) => setFiles([...files, ...newFiles])}
              accept="*"
              multiple
              maxSize={20}
              label="Attachments"
              description="Upload any relevant files (optional)"
            />
            <FileList files={files} onRemove={(index) => setFiles(files.filter((_, i) => i !== index))} />
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/requests')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
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
      </CardContent>
    </Card>
  );
}
