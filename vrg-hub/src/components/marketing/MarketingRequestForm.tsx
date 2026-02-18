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
import { Loader2, Calendar } from 'lucide-react';
import { BrandLocationSelect } from '@/components/ui/brand-location-select';

interface MarketingRequestFormProps {
  onSuccess?: () => void;
}

export function MarketingRequestForm({ onSuccess }: MarketingRequestFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    request_type: '',
    description: '',
    target_audience: '',
    deadline: '',
    priority: 'medium',
    brandId: profile?.brand_id || '',
    locationId: profile?.location_id || '',
    // Additional service-specific fields
    service_category: '',
    estimated_budget: '',
    approval_required: 'no',
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
        description: 'You must be logged in to submit a marketing request',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Build metadata with additional fields
      const metadata = {
        service_category: formData.service_category,
        estimated_budget: formData.estimated_budget,
        approval_required: formData.approval_required,
      };

      const { data, error } = await supabase
        .from('marketing_requests')
        .insert({
          user_id: user.id,
          title: formData.title,
          request_type: formData.request_type,
          description: formData.description,
          target_audience: formData.target_audience,
          deadline: formData.deadline || null,
          priority: formData.priority,
          brand_id: formData.brandId || null,
          location_id: formData.locationId || null,
          status: 'submitted',
          metadata: metadata,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Marketing request submitted successfully',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/marketing/${data.id}`);
      }
    } catch (error) {
      console.error('Error submitting marketing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit marketing request',
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
        <CardTitle>New Marketing Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Request Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Brief description of your marketing request"
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
            <Label htmlFor="request_type">Request Type *</Label>
            <Select
              value={formData.request_type}
              onValueChange={(value) => handleChange('request_type', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fax_blast">Fax Blast</SelectItem>
                <SelectItem value="email_blast">Email Blast</SelectItem>
                <SelectItem value="website_update">Website Update</SelectItem>
                <SelectItem value="social_media">Social Media Campaign</SelectItem>
                <SelectItem value="print_materials">Print Materials</SelectItem>
                <SelectItem value="graphic_design">Graphic Design</SelectItem>
                <SelectItem value="event_marketing">Event Marketing</SelectItem>
                <SelectItem value="content_creation">Content Creation</SelectItem>
                <SelectItem value="seo_services">SEO Services</SelectItem>
                <SelectItem value="advertising">Advertising Campaign</SelectItem>
                <SelectItem value="branding">Branding / Rebranding</SelectItem>
                <SelectItem value="market_research">Market Research</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Provide detailed information about your marketing request"
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_audience">Target Audience</Label>
            <Input
              id="target_audience"
              value={formData.target_audience}
              onChange={(e) => handleChange('target_audience', e.target.value)}
              placeholder="e.g., Referring physicians, Patients, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_category">Service Category</Label>
            <Select
              value={formData.service_category}
              onValueChange={(value) => handleChange('service_category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creative">Creative Services</SelectItem>
                <SelectItem value="digital">Digital Marketing</SelectItem>
                <SelectItem value="traditional">Traditional Marketing</SelectItem>
                <SelectItem value="analytics">Analytics & Research</SelectItem>
                <SelectItem value="strategy">Strategy & Consulting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated_budget">Estimated Budget (optional)</Label>
            <Input
              id="estimated_budget"
              value={formData.estimated_budget}
              onChange={(e) => handleChange('estimated_budget', e.target.value)}
              placeholder="e.g., $5,000 or TBD"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="approval_required">Manager Approval Required?</Label>
            <Select
              value={formData.approval_required}
              onValueChange={(value) => handleChange('approval_required', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                  className="pl-10"
                />
              </div>
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
