import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdvanceNoticeOptions } from "@/hooks/useAdvanceNoticeOptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Bell, Mail, Smartphone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ReminderAttachments } from "@/components/reminders/ReminderAttachments";

export default function ReminderEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [customDays, setCustomDays] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_type: 'general',
    reminder_date: '',
    is_recurring: false,
    recurrence_pattern: 'monthly',
    recurrence_interval: 1,
    email_enabled: true,
    sms_enabled: false,
    in_app_enabled: true,
    phone_number: '',
    email: '',
    advance_notice_days: [1],
    repeat_until_complete: false,
  });

  const { data: reminder, isLoading: isLoadingReminder } = useQuery({
    queryKey: ['reminder', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Reminder not found');
      return data;
    },
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: ['reminder-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data;
    },
  });

  const { data: advanceNoticeOptions } = useAdvanceNoticeOptions();
  const predefinedDays = advanceNoticeOptions?.map(opt => opt.days) || [365, 90, 60, 30, 14, 7, 1];

  useEffect(() => {
    if (reminder && !isLoaded) {
      const channels = reminder.notification_channels as { email?: boolean; sms?: boolean; in_app?: boolean } || {};
      
      // Convert reminder_date to datetime-local format
      const date = new Date(reminder.reminder_date);
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        title: reminder.title || '',
        description: reminder.description || '',
        reminder_type: reminder.reminder_type || 'general',
        reminder_date: localDateTime,
        is_recurring: reminder.is_recurring || false,
        recurrence_pattern: reminder.recurrence_pattern || 'monthly',
        recurrence_interval: reminder.recurrence_interval || 1,
        email_enabled: channels.email ?? true,
        sms_enabled: channels.sms ?? false,
        in_app_enabled: channels.in_app ?? true,
        phone_number: reminder.phone_number || '',
        email: reminder.email || '',
        advance_notice_days: reminder.advance_notice_days || [7, 3, 1],
        repeat_until_complete: (reminder as any).repeat_until_complete || false,
      });
      setIsLoaded(true);
    }
  }, [reminder, isLoaded]);

  // Auto-populate phone number when SMS is enabled
  useEffect(() => {
    if (formData.sms_enabled && !formData.phone_number && profile?.phone) {
      setFormData(prev => ({
        ...prev,
        phone_number: profile.phone
      }));
    }
  }, [formData.sms_enabled, profile?.phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert datetime-local to UTC ISO string
      const localDate = new Date(formData.reminder_date);
      const utcDateString = localDate.toISOString();

      const { error } = await supabase
        .from('reminders')
        .update({
          title: formData.title,
          description: formData.description,
          reminder_type: formData.reminder_type,
          reminder_date: utcDateString,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
          recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
          notification_channels: {
            email: formData.email_enabled,
            sms: formData.sms_enabled,
            in_app: formData.in_app_enabled,
          },
          phone_number: formData.phone_number || null,
          email: formData.email || null,
          advance_notice_days: formData.advance_notice_days,
          repeat_until_complete: formData.repeat_until_complete,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Reminder updated successfully');
      queryClient.invalidateQueries({ queryKey: ['reminder', id] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      navigate(`/reminders/${id}`);
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      toast.error('Failed to update reminder: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAdvanceDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      advance_notice_days: prev.advance_notice_days.includes(day)
        ? prev.advance_notice_days.filter(d => d !== day)
        : [...prev.advance_notice_days, day].sort((a, b) => b - a)
    }));
  };

  const handleCustomDaysSubmit = () => {
    const days = parseInt(customDays);
    if (days > 0 && !formData.advance_notice_days.includes(days)) {
      setFormData(prev => ({
        ...prev,
        advance_notice_days: [...prev.advance_notice_days, days].sort((a, b) => b - a)
      }));
      setCustomDays('');
    }
  };

  const customSelectedDays = formData.advance_notice_days.filter(d => !predefinedDays.includes(d));

  if (isLoadingReminder) {
    return (
      <div className="container-responsive py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reminders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-muted-foreground">Loading reminder...</div>
        </div>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="container-responsive py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reminders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-muted-foreground">Reminder not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/reminders/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Reminder</h1>
          <p className="text-muted-foreground">Update reminder details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reminder Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Medical License Renewal"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional details about this reminder..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="reminder_type">Type *</Label>
                  <Select
                    value={formData.reminder_type}
                    onValueChange={(value) => setFormData({ ...formData, reminder_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name.toLowerCase().replace(' ', '_')}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reminder_date">Reminder Date *</Label>
                  <Input
                    id="reminder_date"
                    type="datetime-local"
                    value={formData.reminder_date}
                    onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recurring Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_recurring">Make this recurring</Label>
                  <Switch
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                  />
                </div>

                {formData.is_recurring && (
                  <>
                    <div>
                      <Label htmlFor="recurrence_pattern">Repeat</Label>
                      <Select
                        value={formData.recurrence_pattern}
                        onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="fortnightly">Fortnightly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="recurrence_interval">Every</Label>
                      <Input
                        id="recurrence_interval"
                        type="number"
                        min="1"
                        value={formData.recurrence_interval}
                        onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        e.g., Every 2 {formData.recurrence_pattern}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Repeat Until Complete</CardTitle>
                <CardDescription>Continue sending daily reminders after due date until task is marked complete</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="repeat_until_complete">Keep reminding until completed</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sends daily reminders after the due date passes until you mark the task as done
                    </p>
                  </div>
                  <Switch
                    id="repeat_until_complete"
                    checked={formData.repeat_until_complete}
                    onCheckedChange={(checked) => setFormData({ ...formData, repeat_until_complete: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <Label htmlFor="email_enabled">Email</Label>
                  </div>
                  <Switch
                    id="email_enabled"
                    checked={formData.email_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, email_enabled: checked })}
                  />
                </div>

                {formData.email_enabled && (
                  <div>
                    <Label htmlFor="email" className="text-xs">Custom Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Override default email"
                      className="text-sm"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <Label htmlFor="sms_enabled">SMS</Label>
                  </div>
                  <Switch
                    id="sms_enabled"
                    checked={formData.sms_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, sms_enabled: checked })}
                  />
                </div>

                {formData.sms_enabled && (
                  <div>
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+61 400 000 000"
                      required={formData.sms_enabled}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <Label htmlFor="in_app_enabled">In-App</Label>
                  </div>
                  <Switch
                    id="in_app_enabled"
                    checked={formData.in_app_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, in_app_enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advance Notices</CardTitle>
                <CardDescription>When to send reminders before the date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {advanceNoticeOptions?.map((opt) => (
                  <div key={opt.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${opt.days}`}
                      checked={formData.advance_notice_days.includes(opt.days)}
                      onCheckedChange={() => toggleAdvanceDay(opt.days)}
                    />
                    <label
                      htmlFor={`day-${opt.days}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {opt.label} before
                    </label>
                  </div>
                ))}

                {customSelectedDays.length > 0 && (
                  <div className="pt-2 border-t space-y-2">
                    <p className="text-xs text-muted-foreground">Custom advance notices:</p>
                    {customSelectedDays.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`custom-${day}`}
                          checked={true}
                          onCheckedChange={() => toggleAdvanceDay(day)}
                        />
                        <label
                          htmlFor={`custom-${day}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {day} days before
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t">
                  <Label htmlFor="custom-days" className="text-sm">Custom days before</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="custom-days"
                      type="number"
                      min="1"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCustomDaysSubmit();
                        }
                      }}
                      placeholder="e.g., 45"
                      className="text-sm"
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={handleCustomDaysSubmit}
                      disabled={!customDays || parseInt(customDays) <= 0}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {id && <ReminderAttachments reminderId={id} canEdit={true} />}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/reminders/${id}`)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
