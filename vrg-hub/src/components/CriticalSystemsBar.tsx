import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
// Icons available if needed: CheckCircle2, AlertTriangle, AlertCircle
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SystemStatus {
  id: string;
  system_name: string;
  status: 'operational' | 'degraded' | 'outage';
  message: string | null;
  icon: string | null;
  is_critical: boolean;
}

export function CriticalSystemsBar() {
  const { data: criticalSystems = [] } = useQuery({
    queryKey: ['critical-system-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_statuses')
        .select('*')
        .eq('is_active', true)
        .eq('is_critical', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as SystemStatus[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'operational':
        return <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />;
      case 'degraded':
        return <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />;
      case 'outage':
        return <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />;
      default:
        return <div className="h-2 w-2 rounded-full bg-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded Performance';
      case 'outage':
        return 'Service Outage';
      default:
        return 'Unknown';
    }
  };

  if (criticalSystems.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {criticalSystems.map((system) => (
          <Tooltip key={system.id}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent/50 transition-colors cursor-pointer">
                {system.icon && (
                  <img 
                    src={system.icon} 
                    alt={system.system_name}
                    className="w-5 h-5 object-contain"
                  />
                )}
                {getStatusIndicator(system.status)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold">{system.system_name}</p>
                <p className="text-xs text-muted-foreground">{getStatusText(system.status)}</p>
                {system.message && (
                  <p className="text-xs">{system.message}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
