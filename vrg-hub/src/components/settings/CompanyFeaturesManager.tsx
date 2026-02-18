import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

export function CompanyFeaturesManager() {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('manage_company_features') || ['tenant_admin', 'super_admin'].includes(userRole || '');

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('feature_key');

      if (error) throw error;
      return data || [];
    },
  });

  const toggleFeature = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: isEnabled })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('Feature updated');
    },
    onError: (error) => {
      toast.error('Failed to update feature');
      console.error(error);
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Flags</CardTitle>
        <CardDescription>
          Enable or disable features across the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {features.map((feature) => (
          <div key={feature.id} className="flex items-center justify-between py-3 border-b last:border-0">
            <div className="space-y-1">
              <Label htmlFor={feature.feature_key} className="font-medium">
                {feature.feature_key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </Label>
              {feature.description && (
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              )}
            </div>
            <Switch
              id={feature.feature_key}
              checked={feature.is_enabled}
              disabled={!canEdit}
              onCheckedChange={(checked) =>
                toggleFeature.mutate({ id: feature.id, isEnabled: checked })
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
