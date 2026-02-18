import { useEffect, useState, useRef } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { Building2, ShoppingCart, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  activeTenants: number;
  globalOrders: number;
  avgProcessingDays: number;
}

export function SuperAdminStats() {
  const [stats, setStats] = useState<Stats>({
    activeTenants: 0,
    globalOrders: 0,
    avgProcessingDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = async () => {
    try {
      // Single-tenant: show static stats for Vision Radiology
      setStats({
        activeTenants: 1,
        globalOrders: 0,
        avgProcessingDays: 0,
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscriptions
    const companiesChannel = supabase
      .channel('companies-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies'
        },
        () => {
          // Debounce: only refetch after 2 seconds of no changes
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(fetchStats, 2000);
        }
      )
      .subscribe();

    const requestsChannel = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hardware_requests'
        },
        () => {
          // Debounce: only refetch after 2 seconds of no changes
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(fetchStats, 2000);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(companiesChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DashboardCard 
        title="Active Tenants" 
        value={stats.activeTenants} 
        icon={Building2}
      />
      <DashboardCard 
        title="Global Orders" 
        value={stats.globalOrders} 
        icon={ShoppingCart}
      />
      <DashboardCard 
        title="Avg Processing Time" 
        value={stats.avgProcessingDays > 0 ? `${stats.avgProcessingDays}d` : 'N/A'} 
        icon={TrendingUp}
        description="Days to approval"
      />
    </div>
  );
}
