import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SystemStatus {
  id: string;
  system_name: string;
  status: 'operational' | 'degraded' | 'outage';
  message: string | null;
  sort_order: number;
  icon: string | null;
  is_critical: boolean;
}

export function SystemStatusIndicator() {
  
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  const isSuperAdmin = userRole === 'super_admin';

  const { data: systems = [] } = useQuery({
    queryKey: ['system-statuses'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('system_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as SystemStatus[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getOverallStatus = () => {
    if (systems.length === 0) return 'operational';
    if (systems.some(s => s.status === 'outage')) return 'outage';
    if (systems.some(s => s.status === 'degraded')) return 'degraded';
    return 'operational';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'outage':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'outage':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'All Systems Operational';
      case 'degraded':
        return 'Some Systems Degraded';
      case 'outage':
        return 'System Outage';
      default:
        return 'Unknown Status';
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          aria-label="System Status"
        >
          <span className="text-sm">System Status</span>
          <div className={`h-2 w-2 rounded-full ${getStatusColor(overallStatus)} animate-pulse`} />
          <Activity className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 bg-background border shadow-lg z-50"
      >
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">System Status</h3>
            <Badge variant="outline" className="gap-1">
              {getStatusIcon(overallStatus)}
              {getStatusText(overallStatus)}
            </Badge>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {systems.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No systems configured
            </div>
          ) : (
            systems.map((system) => (
              <DropdownMenuItem 
                key={system.id}
                className="flex flex-col items-start gap-1 px-3 py-3 cursor-default focus:bg-muted"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {system.icon ? (
                      <img 
                        src={system.icon} 
                        alt={system.system_name}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <div className="w-6 h-6 flex items-center justify-center text-sm font-semibold">
                        {system.system_name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium">{system.system_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(system.status)}
                    <span className="text-xs capitalize text-muted-foreground">
                      {system.status}
                    </span>
                  </div>
                </div>
                {system.message && (
                  <p className="text-xs text-muted-foreground ml-8">{system.message}</p>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>

        {isSuperAdmin && (
          <div className="px-3 py-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false);
                navigate('/settings?tab=system-status');
              }}
            >
              Manage System Status
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
