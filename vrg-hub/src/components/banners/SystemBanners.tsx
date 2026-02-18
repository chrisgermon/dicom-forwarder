import { useEffect, useState } from 'react';
import { X, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  show_on_pages: string[];
}

export function SystemBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissedBanners');
    return stored ? JSON.parse(stored) : [];
  });
  const { company: _company } = useAuth(); void _company;

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase
        .from('system_banners')
        .select('id, title, message, type, show_on_pages, start_date, end_date')
        .eq('is_active', true);

      if (data) {
        const now = new Date();
        const activeBanners = data.filter(b => {
          // Check if banner is dismissed
          if (dismissedBanners.includes(b.id)) return false;
          
          // Check start date
          if (b.start_date && new Date(b.start_date) > now) return false;
          
          // Check end date - banner should not show if end date has passed
          if (b.end_date) {
            const endDate = new Date(b.end_date);
            // Set end date to end of day to include the full end date
            endDate.setHours(23, 59, 59, 999);
            if (endDate < now) return false;
          }
          
          return true;
        }) as Banner[];
        setBanners(activeBanners);
      }
    };

    fetchBanners();

    const channel = supabase
      .channel('system_banners')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_banners'
        },
        () => fetchBanners()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dismissedBanners]);

  const dismissBanner = (bannerId: string) => {
    const updated = [...dismissedBanners, bannerId];
    setDismissedBanners(updated);
    localStorage.setItem('dismissedBanners', JSON.stringify(updated));
    setBanners(banners.filter(b => b.id !== bannerId));
  };

  const getIcon = (type: Banner['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getVariant = (type: Banner['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {banners.map((banner) => (
        <Alert
          key={banner.id}
          variant={getVariant(banner.type)}
          className="relative"
        >
          <div className="flex items-start gap-3">
            {getIcon(banner.type)}
            <div className="flex-1">
              <AlertTitle>{banner.title}</AlertTitle>
              <AlertDescription className="mt-1">
                {banner.message}
              </AlertDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => dismissBanner(banner.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
