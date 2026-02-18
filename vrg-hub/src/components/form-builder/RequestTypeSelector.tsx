import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RequestType {
  id: string;
  name: string;
  slug: string;
}

interface RequestTypeSelectorProps {
  value: string | null;
  onChange: (id: string) => void;
}

export function RequestTypeSelector({ value, onChange }: RequestTypeSelectorProps) {
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadRequestTypes();
  }, []);

  const loadRequestTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('request_types')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setRequestTypes(data || []);
    } catch (error) {
      console.error('Error loading request types:', error);
    }
  };

  const handleCreateNew = async () => {
    if (!newTypeName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a request type name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const slug = newTypeName.toLowerCase().replace(/\s+/g, '-');
      
      const { data, error } = await supabase
        .from('request_types')
        .insert({
          name: newTypeName,
          slug,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setRequestTypes([...requestTypes, data]);
      onChange(data.id);
      setIsCreatingNew(false);
      setNewTypeName('');
      
      toast({
        title: 'Success',
        description: 'Request type created successfully',
      });
    } catch (error) {
      console.error('Error creating request type:', error);
      toast({
        title: 'Error',
        description: 'Failed to create request type',
        variant: 'destructive',
      });
    }
  };

  if (isCreatingNew) {
    return (
      <div className="space-y-2">
        <Label>New Request Type</Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., IT Service Desk"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateNew();
              if (e.key === 'Escape') {
                setIsCreatingNew(false);
                setNewTypeName('');
              }
            }}
          />
          <Button onClick={handleCreateNew} size="sm">
            Create
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsCreatingNew(false);
              setNewTypeName('');
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Request Type</Label>
      <div className="flex gap-2">
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select request type" />
          </SelectTrigger>
          <SelectContent>
            {requestTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreatingNew(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
