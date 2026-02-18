import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

interface MentionPickerProps {
  onSelect: (email: string) => void;
  onClose: () => void;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export function MentionPicker({ onSelect, onClose }: MentionPickerProps) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length < 2) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
          .eq('is_active', true)
          .limit(10);

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error searching users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Add people to CC</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Input
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {users.map((user) => (
            <Button
              key={user.id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => onSelect(user.email)}
            >
              <div className="text-left">
                <div className="font-medium">{user.full_name || user.email}</div>
                {user.full_name && (
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                )}
              </div>
            </Button>
          ))}
        </div>
      )}

      {!loading && search.length >= 2 && users.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No users found
        </p>
      )}

      {search.length < 2 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Type at least 2 characters to search
        </p>
      )}
    </Card>
  );
}
