import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdvanceNoticeOptions } from "@/hooks/useAdvanceNoticeOptions";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Bell, ChevronDown, Plus, Check, X, Paperclip, Upload, Lightbulb } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { formatAUDateShort } from "@/lib/dateUtils";

const typeConfig: Record<string, { icon: string; color: string }> = {
  general: { icon: '📌', color: 'hsl(var(--primary))' },
  license: { icon: '📋', color: '#f59e0b' },
  contract: { icon: '📝', color: '#8b5cf6' },
  maintenance: { icon: '🔧', color: '#ef4444' },
  meeting: { icon: '👥', color: '#22c55e' },
  billing: { icon: '💳', color: '#06b6d4' },
};

export default function NewReminder() {
  const navigate = useNavigate();
  const { profile, user, userRole } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';
  const { logCreate } = useAuditLog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendNow, setSendNow] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customDays, setCustomDays] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_type: 'general',
    reminder_date: '',
    reminder_time: '',
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
    cc_emails: [] as string[],
  });
  const [ccEmailInput, setCcEmailInput] = useState('');

  // Categories query - kept for potential future use
  void useQuery({
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

  // Fetch upcoming reminders for sidebar (shared key with Reminders page for cache reuse)
  const { data: upcomingReminders } = useQuery({
    queryKey: ['upcoming-reminders', user?.id ?? null, 4],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .gte('reminder_date', new Date().toISOString())
        .order('reminder_date', { ascending: true })
        .limit(4);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch reminder stats for sidebar
  const { data: reminderStats } = useQuery({
    queryKey: ['reminder-stats-sidebar'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { active: 0, thisWeek: 0, overdue: 0 };
      
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const { data: all } = await supabase
        .from('reminders')
        .select('reminder_date, status')
        .eq('user_id', user.id);
      
      const active = all?.filter(r => r.status !== 'completed').length || 0;
      const thisWeek = all?.filter(r => {
        const d = new Date(r.reminder_date);
        return d >= now && d <= weekEnd;
      }).length || 0;
      const overdue = all?.filter(r => {
        const d = new Date(r.reminder_date);
        return d < now && r.status !== 'completed';
      }).length || 0;
      
      return { active, thisWeek, overdue };
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to create reminders');
        return;
      }

      const dateTimeString = formData.reminder_time 
        ? `${formData.reminder_date}T${formData.reminder_time}`
        : `${formData.reminder_date}T09:00`;
      const localDate = new Date(dateTimeString);
      const utcDateString = localDate.toISOString();

      const { data: inserted, error } = await supabase.from('reminders').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        reminder_type: formData.reminder_type,
        reminder_date: utcDateString,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
        recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
        notification_channels: {
          email: formData.email_enabled || formData.cc_emails.length > 0,
          sms: formData.sms_enabled,
          in_app: formData.in_app_enabled,
        },
        phone_number: formData.phone_number || null,
        email: formData.email || null,
        cc_emails: formData.cc_emails.length > 0 ? formData.cc_emails : null,
        advance_notice_days: formData.advance_notice_days,
        repeat_until_complete: formData.repeat_until_complete,
      }).select('*').single();

      if (error) throw error;

      if (inserted?.id && selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${inserted.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('reminder-attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            toast.error(`Failed to upload ${file.name}`);
          } else {
            await supabase.from('reminder_attachments').insert({
              reminder_id: inserted.id,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              content_type: file.type,
              uploaded_by: user.id,
            });
          }
        }
      }

      if (isSuperAdmin && sendNow && inserted?.id) {
        // Execute in background - don't await
        toast.info('Sending reminder...');
        supabase.functions.invoke('send-reminder-now', {
          body: { reminderId: inserted.id },
        }).then(({ error: sendError }) => {
          if (sendError) {
            toast.error('Failed to send now: ' + sendError.message);
          } else {
            toast.success('Reminder sent successfully');
          }
        }).catch((e: any) => {
          toast.error('Failed to send now: ' + e.message);
        });
      }

      await logCreate('reminders', inserted?.id || '', { title: formData.title, type: formData.reminder_type });
      toast.success('Reminder created successfully!');
      navigate('/reminders');
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceNoticeChange = (value: string) => {
    if (value === 'custom') {
      setShowAdvanced(true);
      return;
    }
    const days = parseInt(value);
    if (!isNaN(days)) {
      setFormData(prev => ({
        ...prev,
        advance_notice_days: [days]
      }));
    }
  };

  const handleCustomDaysSubmit = () => {
    const days = parseInt(customDays);
    if (days > 0) {
      setFormData(prev => ({
        ...prev,
        advance_notice_days: [days]
      }));
      setCustomDays('');
    }
  };

  useEffect(() => {
    if (formData.sms_enabled && !formData.phone_number && profile?.phone) {
      setFormData(prev => ({
        ...prev,
        phone_number: profile.phone
      }));
    }
  }, [formData.sms_enabled, profile?.phone]);

  const toggleNotification = (key: 'email_enabled' | 'sms_enabled' | 'in_app_enabled') => {
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const getDaysUntil = (date: string) => {
    const days = differenceInDays(new Date(date), new Date());
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex">
        {/* Desktop Sidebar - Hidden on mobile, positioned on right below header */}
        <aside className="hidden lg:flex lg:w-80 lg:flex-col lg:fixed lg:right-0 lg:top-16 lg:bottom-0 bg-gradient-to-b from-slate-800 to-slate-900 text-white z-40">
          {/* Logo/Branding */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Reminders</h2>
                <p className="text-xs text-slate-400">Never miss a deadline</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-6 border-b border-white/10">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{reminderStats?.active || 0}</div>
                <div className="text-xs text-slate-400">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{reminderStats?.thisWeek || 0}</div>
                <div className="text-xs text-slate-400">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{reminderStats?.overdue || 0}</div>
                <div className="text-xs text-slate-400">Overdue</div>
              </div>
            </div>
          </div>

          {/* Upcoming Reminders */}
          <div className="flex-1 p-6 overflow-auto">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Coming Up</h3>
            <div className="space-y-3">
              {upcomingReminders?.slice(0, 4).map((reminder) => {
                const config = typeConfig[reminder.reminder_type] || typeConfig.general;
                return (
                  <div key={reminder.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div 
                      className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{reminder.title}</p>
                      <p className="text-xs text-slate-400">
                        {formatAUDateShort(new Date(reminder.reminder_date))} • {getDaysUntil(reminder.reminder_date)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!upcomingReminders || upcomingReminders.length === 0) && (
                <p className="text-sm text-slate-500 text-center py-4">No upcoming reminders</p>
              )}
            </div>
          </div>

          {/* Pro Tip */}
          <div className="p-6 border-t border-white/10">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Pro Tip</p>
                  <p className="text-xs text-slate-300 mt-1">
                    Set recurring reminders for tasks that repeat regularly, like license renewals or monthly reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:mr-80">
          <div className="max-w-4xl mx-auto px-4 py-6 lg:py-10 lg:px-8">
            {/* Form Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 lg:px-8 lg:py-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => navigate('/reminders')}
                    className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-primary/50 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">New Reminder</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Stay on top of important dates</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Form Body */}
                <div className="p-6 lg:p-8 space-y-7">
                  {/* Title - Primary Field - Full Width */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">What do you need to remember?</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Medical License Renewal"
                      className="h-14 text-lg font-medium rounded-2xl bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/10"
                      required
                    />
                  </div>

                  {/* Two Column Grid for Desktop */}
                  <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Type Selection - Visual Chips */}
                      <div className="space-y-3">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(typeConfig).map(([value, config]) => {
                            const isSelected = formData.reminder_type === value;
                            const label = value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ');
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setFormData({ ...formData, reminder_type: value })}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-md",
                                  isSelected 
                                    ? "border-2 shadow-md" 
                                    : "bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                )}
                                style={isSelected ? {
                                  borderColor: config.color,
                                  backgroundColor: `${config.color}10`,
                                  color: config.color,
                                } : undefined}
                              >
                                <span className="text-base">{config.icon}</span>
                                <span className="truncate">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Date & Time - Side by Side */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</Label>
                          <Input
                            type="date"
                            value={formData.reminder_date}
                            onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                            className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/10"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</Label>
                          <Input
                            type="time"
                            value={formData.reminder_time}
                            onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                            className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Advance Notice - Clean Dropdown */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remind me</Label>
                        <Select
                          value={formData.advance_notice_days[0]?.toString() || '1'}
                          onValueChange={handleAdvanceNoticeChange}
                        >
                          <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800 z-50">
                            {advanceNoticeOptions?.map((opt) => (
                              <SelectItem key={opt.id} value={opt.days.toString()}>
                                {opt.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">Custom...</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Notification Methods - Stacked on Desktop, Horizontal on Mobile */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notify via</Label>
                        <div className="flex flex-row lg:flex-col gap-2">
                          {[
                            { key: 'email_enabled' as const, label: 'Email', icon: '✉️' },
                            { key: 'in_app_enabled' as const, label: 'In-App', icon: '🔔' },
                            { key: 'sms_enabled' as const, label: 'SMS', icon: '💬' },
                          ].map((channel) => (
                            <button
                              key={channel.key}
                              type="button"
                              onClick={() => toggleNotification(channel.key)}
                              className={cn(
                                "flex-1 lg:flex-initial flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                                formData[channel.key]
                                  ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400"
                                  : "bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
                              )}
                            >
                              <span>{channel.icon}</span>
                              <span className="hidden sm:inline lg:inline">{channel.label}</span>
                              {formData[channel.key] && <Check className="h-4 w-4 ml-auto" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes/Description for Desktop - Hidden on Mobile (shown in Advanced) */}
                      <div className="hidden lg:block space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes (optional)</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Add any notes or details..."
                          className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 min-h-[100px] resize-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SMS Phone Input */}
                  {formData.sms_enabled && (
                    <div className="space-y-2 animate-fade-in">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SMS Phone Number</Label>
                      <Input
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        placeholder="+61 400 000 000"
                        className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
                        required={formData.sms_enabled}
                      />
                    </div>
                  )}

                  {/* CC Emails Section */}
                  {formData.email_enabled && (
                    <div className="space-y-2 animate-fade-in">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Additional Recipients (CC)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          value={ccEmailInput}
                          onChange={(e) => setCcEmailInput(e.target.value)}
                          placeholder="Add email address..."
                          className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const email = ccEmailInput.trim();
                              if (email && !formData.cc_emails.includes(email)) {
                                setFormData(prev => ({ ...prev, cc_emails: [...prev.cc_emails, email] }));
                                setCcEmailInput('');
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => {
                            const email = ccEmailInput.trim();
                            if (email && !formData.cc_emails.includes(email)) {
                              setFormData(prev => ({ ...prev, cc_emails: [...prev.cc_emails, email] }));
                              setCcEmailInput('');
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {formData.cc_emails.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {formData.cc_emails.map((email, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm"
                            >
                              {email}
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, cc_emails: prev.cc_emails.filter((_, i) => i !== idx) }))}
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Advanced Options Toggle */}
                  <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
                      >
                        <span>Advanced Options</span>
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform duration-300",
                          showAdvanced && "rotate-180"
                        )} />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="animate-fade-in">
                      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 space-y-6">
                        {/* Description for Mobile */}
                        <div className="lg:hidden space-y-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes (optional)</Label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Add any notes or details..."
                            className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 min-h-[80px] resize-none"
                            rows={3}
                          />
                        </div>

                        {/* Custom Days Input */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Reminder Days</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={customDays}
                              onChange={(e) => setCustomDays(e.target.value)}
                              placeholder="Enter number of days"
                              min={1}
                              className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
                            />
                            <Button
                              type="button"
                              onClick={handleCustomDaysSubmit}
                              variant="outline"
                              className="rounded-xl"
                            >
                              Set
                            </Button>
                          </div>
                        </div>

                        {/* Toggles Grid */}
                        <div className="grid lg:grid-cols-2 gap-4">
                          {/* Recurring Toggle */}
                          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Recurring</p>
                              <p className="text-xs text-slate-500">Repeat on a schedule</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, is_recurring: !prev.is_recurring }))}
                              className={cn(
                                "relative w-11 h-6 rounded-full transition-colors duration-200",
                                formData.is_recurring ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200",
                                formData.is_recurring ? "translate-x-6" : "translate-x-1"
                              )} />
                            </button>
                          </div>

                          {/* Persistent Toggle */}
                          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Persistent</p>
                              <p className="text-xs text-slate-500">Remind daily until done</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, repeat_until_complete: !prev.repeat_until_complete }))}
                              className={cn(
                                "relative w-11 h-6 rounded-full transition-colors duration-200",
                                formData.repeat_until_complete ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200",
                                formData.repeat_until_complete ? "translate-x-6" : "translate-x-1"
                              )} />
                            </button>
                          </div>
                        </div>

                        {formData.is_recurring && (
                          <div className="animate-fade-in space-y-2">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Repeat Interval</Label>
                            <Select
                              value={formData.recurrence_pattern}
                              onValueChange={(v) => setFormData(prev => ({ ...prev, recurrence_pattern: v }))}
                            >
                              <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-800 z-50">
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="fortnightly">Fortnightly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* File Upload Zone - Full Width */}
                        <div className="space-y-3">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attachments</Label>
                          <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            className={cn(
                              "relative rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                              isDragging 
                                ? "border-primary bg-primary/5" 
                                : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                            )}
                          >
                            <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Drag and drop files here, or{' '}
                              <label className="text-primary font-medium cursor-pointer hover:underline">
                                browse
                                <input
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                    }
                                  }}
                                />
                              </label>
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Max 20MB per file</p>
                          </div>
                          
                          {selectedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {selectedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg text-sm">
                                  <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                                  <span className="truncate max-w-[150px] text-slate-700 dark:text-slate-300">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== idx))}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Send Now Option for Super Admin */}
                        {isSuperAdmin && (
                          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <div>
                              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Send Immediately</p>
                              <p className="text-xs text-amber-600 dark:text-amber-400">Send notification right after creation</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSendNow(!sendNow)}
                              className={cn(
                                "relative w-11 h-6 rounded-full transition-colors duration-200",
                                sendNow ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200",
                                sendNow ? "translate-x-6" : "translate-x-1"
                              )} />
                            </button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 lg:px-8 lg:py-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate('/reminders')}
                      className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Cancel
                    </Button>
                    <div className="flex items-center gap-3">
                      {/* Save as Draft - Desktop Only */}
                      <Button
                        type="button"
                        variant="outline"
                        className="hidden lg:flex rounded-xl border-slate-200 dark:border-slate-600"
                        onClick={() => toast.info('Draft feature coming soon')}
                      >
                        Save as Draft
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !formData.title || !formData.reminder_date}
                        className="rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all px-6"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Reminder
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
