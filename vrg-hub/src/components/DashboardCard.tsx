import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  quickAction?: {
    label: string;
    url: string;
  };
  progress?: number; // 0-100 for progress bar
  className?: string;
}

export function DashboardCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  quickAction,
  progress,
  className 
}: DashboardCardProps) {
  const navigate = useNavigate();

  return (
    <Card className={`group relative overflow-hidden p-6 bg-gradient-card shadow-card hover:shadow-elevated transition-smooth hover-scale ${className}`}>
      {/* Animated background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-3xl font-bold animate-fade-in">{value}</p>
              {trend && (
                <span className={`text-xs px-2 py-1 rounded-full animate-scale-in ${
                  trend.isPositive 
                    ? 'bg-status-approved/10 text-status-approved' 
                    : 'bg-status-declined/10 text-status-declined'
                }`}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
            <Icon className="w-7 h-7 text-primary" />
          </div>
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="mb-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {description && (
            <p className="text-xs text-muted-foreground flex-1">{description}</p>
          )}
          
          {quickAction && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(quickAction.url)}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-auto p-1 text-xs gap-1"
            >
              {quickAction.label}
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}