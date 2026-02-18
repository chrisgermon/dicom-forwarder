import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BrandLocationSelect } from '@/components/ui/brand-location-select';
import { FileDropzone, FileList } from '@/components/ui/file-dropzone';

interface TemplatedDepartmentRequestFormProps {
  department: string;
  departmentLabel: string;
}

export function TemplatedDepartmentRequestForm({
  department: _department,
  departmentLabel,
}: TemplatedDepartmentRequestFormProps) {
  const [loading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const { user, profile } = useAuth();
  const [brandId, setBrandId] = useState(profile?.brand_id || '');
  const [locationId, setLocationId] = useState(profile?.location_id || '');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Update when profile loads
  useEffect(() => {
    if (profile?.brand_id && !brandId) {
      setBrandId(profile.brand_id);
      setLocationId(profile.location_id || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit a request',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: request, error } = await supabase
        .from('hardware_requests')
        .insert({
          title,
          description,
          business_justification: `${departmentLabel} request`,
          user_id: user.id,
          brand_id: brandId || null,
          location_id: locationId || null,
          status: 'open',
          priority: 'medium',
          currency: 'USD',
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

      toast({
        title: 'Success',
        description: 'Your request has been submitted successfully',
      });

      navigate(`/requests/${request.id}`);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>New {departmentLabel} Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Request Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of your request"
              required
            />
          </div>

          <BrandLocationSelect
            selectedBrandId={brandId}
            selectedLocationId={locationId}
            onBrandChange={setBrandId}
            onLocationChange={setLocationId}
            required
          />

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about your request"
              rows={6}
              required
            />
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

          <div className="flex gap-4 justify-end">
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
