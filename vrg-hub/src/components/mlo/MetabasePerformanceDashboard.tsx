import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, BarChart3, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface EmbedData {
  embedUrl: string;
  mloName: string | null;
  isAdmin: boolean;
}

export function MetabasePerformanceDashboard() {
  const { user } = useAuth();
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        console.log('[MetabasePerformanceDashboard] Fetching embed URL for:', user.email);
        
        const { data, error: invokeError } = await supabase.functions.invoke('mlo-embed', {
          body: { email: user.email }
        });

        if (invokeError) {
          console.error('[MetabasePerformanceDashboard] Edge function error:', invokeError);
          setError('Failed to load performance dashboard');
          return;
        }

        if (data?.error) {
          console.log('[MetabasePerformanceDashboard] Access denied:', data.error);
          setError(data.error);
          return;
        }

        console.log('[MetabasePerformanceDashboard] Loaded:', { isAdmin: data.isAdmin, mloName: data.mloName });
        setEmbedData(data);
      } catch (e) {
        console.error('[MetabasePerformanceDashboard] Exception:', e);
        setError('Failed to load performance dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Dashboard
          </CardTitle>
          <CardDescription>Loading your performance data from BigQuery...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              {error === 'Access denied - no MLO mapping for this email' 
                ? "Your email is not configured for MLO performance tracking. Contact your administrator if you believe this is an error."
                : error
              }
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!embedData) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Performance Dashboard</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {embedData.isAdmin 
          ? 'Admin View • Select any MLO to view their performance' 
          : `Welcome, ${embedData.mloName}`} • Data refreshes every 15 minutes
      </p>
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="min-w-full px-4 sm:px-6 lg:px-8">
          <iframe
            src={embedData.embedUrl}
            className="w-full border-0 rounded-lg"
            style={{ height: '800px', minWidth: '100%' }}
            allowFullScreen
            title="MLO Performance Dashboard"
          />
        </div>
      </div>
    </div>
  );
}
