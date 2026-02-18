import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface NotificationSettingsProps {
  notificationUserIds: string[];
  notificationLevel: 'all' | 'new_only' | 'updates_only';
  enableSmsNotifications: boolean;
  onNotificationUserIdsChange: (ids: string[]) => void;
  onNotificationLevelChange: (level: 'all' | 'new_only' | 'updates_only') => void;
  onEnableSmsNotificationsChange: (enabled: boolean) => void;
}

export function NotificationSettings({
  notificationUserIds,
  notificationLevel,
  enableSmsNotifications,
  onNotificationUserIdsChange,
  onNotificationLevelChange,
  onEnableSmsNotificationsChange,
}: NotificationSettingsProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    // Update selected profiles when notificationUserIds changes
    const selected = profiles.filter(p => notificationUserIds.includes(p.id));
    setSelectedProfiles(selected);
  }, [notificationUserIds, profiles]);

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');

    if (error) {
      console.error('Error loading profiles:', error);
      return;
    }

    setProfiles(data || []);
  };

  const handleAddUser = (profileId: string) => {
    if (!notificationUserIds.includes(profileId)) {
      onNotificationUserIdsChange([...notificationUserIds, profileId]);
    }
    setOpen(false);
  };

  const handleRemoveUser = (profileId: string) => {
    onNotificationUserIdsChange(notificationUserIds.filter(id => id !== profileId));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Notification Recipients</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedProfiles.map(profile => (
            <Badge key={profile.id} variant="secondary" className="pr-1">
              {profile.full_name || profile.email}
              <button
                type="button"
                onClick={() => handleRemoveUser(profile.id)}
                className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search users..." />
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-auto">
                {profiles
                  .filter(p => !notificationUserIds.includes(p.id))
                  .map(profile => (
                    <CommandItem
                      key={profile.id}
                      onSelect={() => handleAddUser(profile.id)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{profile.full_name}</span>
                        <span className="text-xs text-muted-foreground">{profile.email}</span>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        
        {selectedProfiles.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            No recipients selected. Department assignments will be used as fallback.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="notification-level" className="text-sm">Notification Level</Label>
        <Select value={notificationLevel} onValueChange={onNotificationLevelChange}>
          <SelectTrigger id="notification-level">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All notifications</SelectItem>
            <SelectItem value="new_only">New requests only</SelectItem>
            <SelectItem value="updates_only">Updates only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="sms-notifications" className="text-sm">SMS Notifications</Label>
          <p className="text-xs text-muted-foreground">
            Send SMS to users who have SMS enabled
          </p>
        </div>
        <Switch
          id="sms-notifications"
          checked={enableSmsNotifications}
          onCheckedChange={onEnableSmsNotificationsChange}
        />
      </div>
    </div>
  );
}
