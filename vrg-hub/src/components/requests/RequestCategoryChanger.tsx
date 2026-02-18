import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RequestCategory {
  id: string;
  name: string;
}

interface RequestCategoryChangerProps {
  requestId: string;
  currentCategoryId?: string;
  requestUserId: string;
  onCategoryChanged: () => void;
}

export function RequestCategoryChanger({
  requestId,
  currentCategoryId,
  requestUserId: _requestUserId,
  onCategoryChanged,
}: RequestCategoryChangerProps) {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [categories, setCategories] = useState<RequestCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('request_categories')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCategories();
  }, []);

  const handleCategoryChange = async (newCategoryId: string) => {
    if (newCategoryId === currentCategoryId) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          category_id: newCategoryId,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Category Updated',
        description: 'Request category has been changed successfully',
      });

      onCategoryChanged();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  // Only managers can change category
  if (!isManager) {
    return <p className="text-sm">{categories.find(c => c.id === currentCategoryId)?.name || 'N/A'}</p>;
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  return (
    <Select
      value={currentCategoryId || ''}
      onValueChange={handleCategoryChange}
      disabled={updating}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select category..." />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
