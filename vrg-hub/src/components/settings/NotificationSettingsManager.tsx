import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { useState } from 'react';

const EVENT_TYPES = [
  { key: 'request_created', label: 'New Request Created', description: 'When a new hardware or marketing request is submitted' },
  { key: 'request_approved', label: 'Request Approved', description: 'When your request is approved' },
  { key: 'request_declined', label: 'Request Declined', description: 'When your request is declined' },
  { key: 'request_comment', label: 'New Comment', description: 'When someone comments on your request' },
  { key: 'approval_needed', label: 'Approval Needed', description: 'When a request needs your approval' },
  { key: 'newsletter_assigned', label: 'Newsletter Assignment', description: 'When you are assigned a newsletter contribution' },
  { key: 'newsletter_reminder', label: 'Newsletter Reminder', description: 'Reminder for pending newsletter contributions' },
];

export function NotificationSettingsManager() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
  const [smsEnabled, setSmsEnabled] = useState(profile?.sms_enabled || false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const updateSetting = useMutation({
    mutationFn: async ({ eventType, field, value }: { eventType: string; field: 'email_enabled' | 'in_app_enabled' | 'sms_enabled'; value: boolean }) => {
      const existing = settings.find(s => s.event_type === eventType);

      if (existing) {
        const { error } = await supabase
          .from('notification_settings')
          .update({ [field]: value })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user?.id,
            event_type: eventType,
            [field]: value,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Notification settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update notification settings');
      console.error(error);
    },
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          phone: phoneNumber,
          sms_enabled: smsEnabled 
        })
        .eq('id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update profile');
      console.error(error);
    },
  });

  const getSettingValue = (eventType: string, field: 'email_enabled' | 'in_app_enabled' | 'sms_enabled') => {
    const setting = settings.find(s => s.event_type === eventType);
    return setting ? setting[field] : (field === 'sms_enabled' ? false : true); // SMS defaults to false
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            SMS Notification Settings
          </CardTitle>
          <CardDescription>
            Configure your phone number to receive SMS notifications (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+61 4XX XXX XXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter your phone number in international format (e.g., +61 for Australia)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive SMS alerts for important updates
              </p>
            </div>
            <Switch
              id="sms-enabled"
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
            />
          </div>

          <Button 
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            className="w-full"
          >
            Save SMS Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email & In-App Notification Preferences</CardTitle>
          <CardDescription>
            Choose how you want to be notified about different events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {EVENT_TYPES.map((eventType) => (
          <div key={eventType.key} className="space-y-3 pb-4 border-b last:border-0">
            <div>
              <h4 className="font-medium">{eventType.label}</h4>
              <p className="text-sm text-muted-foreground">{eventType.description}</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${eventType.key}-email`} className="text-sm">
                Email notifications
              </Label>
              <Switch
                id={`${eventType.key}-email`}
                checked={getSettingValue(eventType.key, 'email_enabled')}
                onCheckedChange={(checked) =>
                  updateSetting.mutate({
                    eventType: eventType.key,
                    field: 'email_enabled',
                    value: checked,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${eventType.key}-app`} className="text-sm">
                In-app notifications
              </Label>
              <Switch
                id={`${eventType.key}-app`}
                checked={getSettingValue(eventType.key, 'in_app_enabled')}
                onCheckedChange={(checked) =>
                  updateSetting.mutate({
                    eventType: eventType.key,
                    field: 'in_app_enabled',
                    value: checked,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${eventType.key}-sms`} className="text-sm">
                SMS notifications
              </Label>
              <Switch
                id={`${eventType.key}-sms`}
                checked={getSettingValue(eventType.key, 'sms_enabled')}
                onCheckedChange={(checked) =>
                  updateSetting.mutate({
                    eventType: eventType.key,
                    field: 'sms_enabled',
                    value: checked,
                  })
                }
                disabled={!smsEnabled || !phoneNumber}
              />
            </div>
          </div>
        ))}
        {(!smsEnabled || !phoneNumber) && (
          <p className="text-sm text-muted-foreground pt-4 border-t">
            Configure your phone number and enable SMS in the settings above to receive SMS notifications.
          </p>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
