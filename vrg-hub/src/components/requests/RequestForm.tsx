import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { BrandLocationSelect } from '@/components/ui/brand-location-select';

export function RequestForm() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    business_justification: '',
    priority: 'medium',
    brandId: profile?.brand_id || '',
    locationId: profile?.location_id || '',
  });
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Update form when profile loads
  useEffect(() => {
    if (profile?.brand_id && !formData.brandId) {
      setFormData(prev => ({
        ...prev,
        brandId: profile.brand_id || '',
        locationId: profile.location_id || '',
      }));
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

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          brand_id: formData.brandId || null,
          location_id: formData.locationId || null,
          status: 'open',
          source: 'web_portal',
          metadata: {
            business_justification: formData.business_justification,
          },
        })
        .select()
        .single();

      if (error || !data) throw error;

      toast({
        title: 'Success',
        description: 'Request submitted successfully',
      });

      navigate(`/requests/${data.id}`);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Hardware Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Request Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Brief description of your request"
              required
            />
          </div>

          <BrandLocationSelect
            selectedBrandId={formData.brandId}
            selectedLocationId={formData.locationId}
            onBrandChange={(brandId) => handleChange('brandId', brandId)}
            onLocationChange={(locationId) => handleChange('locationId', locationId)}
            required
          />

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Provide detailed information about your request"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_justification">Business Justification *</Label>
            <Textarea
              id="business_justification"
              value={formData.business_justification}
              onChange={(e) => handleChange('business_justification', e.target.value)}
              placeholder="Explain why this request is needed"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => handleChange('priority', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/requests')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
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
