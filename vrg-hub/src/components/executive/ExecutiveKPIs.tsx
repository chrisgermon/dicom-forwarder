import { DollarSign, FileText, Users, Building2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { KPIs } from "@/hooks/useExecutiveDashboard";

interface ExecutiveKPIsProps {
  data?: KPIs;
  previousData?: KPIs;
  isLoading?: boolean;
}

function calculateTrend(current: number, previous: number): { direction: 'up' | 'down' | 'flat'; percentage: number } {
  if (previous === 0) {
    return current > 0 ? { direction: 'up', percentage: 100 } : { direction: 'flat', percentage: 0 };
  }
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) {
    return { direction: 'flat', percentage: 0 };
  }
  return { direction: change > 0 ? 'up' : 'down', percentage: Math.abs(change) };
}

function TrendIndicator({ current, previous, positiveIsGood = true }: { current: number; previous: number; positiveIsGood?: boolean }) {
  const trend = calculateTrend(current, previous);

  if (trend.direction === 'flat') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <Minus className="w-3 h-3" />
            <span>0%</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>No change from previous period</TooltipContent>
      </Tooltip>
    );
  }

  const isPositive = trend.direction === 'up';
  const isGood = positiveIsGood ? isPositive : !isPositive;
  const colorClass = isGood ? 'text-emerald-600' : 'text-red-600';
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-0.5 text-xs ${colorClass}`}>
          <Icon className="w-3 h-3" />
          <span>{trend.percentage.toFixed(1)}%</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {isPositive ? 'Up' : 'Down'} {trend.percentage.toFixed(1)}% from previous period
      </TooltipContent>
    </Tooltip>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function ExecutiveKPIs({ data, previousData, isLoading }: ExecutiveKPIsProps) {
  const kpis = [
    {
      title: "Total Revenue",
      value: data ? formatCurrency(Number(data.total_revenue) || 0) : "$0",
      rawValue: Number(data?.total_revenue) || 0,
      previousValue: Number(previousData?.total_revenue) || 0,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      accent: "from-emerald-500/80 to-emerald-500/20",
      positiveIsGood: true,
    },
    {
      title: "Study Count",
      value: data ? formatNumber(Number(data.study_count) || 0) : "0",
      rawValue: Number(data?.study_count) || 0,
      previousValue: Number(previousData?.study_count) || 0,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      accent: "from-blue-500/80 to-blue-500/20",
      positiveIsGood: true,
    },
    {
      title: "Unique Radiologists",
      value: data ? formatNumber(Number(data.unique_radiologists) || 0) : "0",
      rawValue: Number(data?.unique_radiologists) || 0,
      previousValue: Number(previousData?.unique_radiologists) || 0,
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      accent: "from-purple-500/80 to-purple-500/20",
      positiveIsGood: true,
    },
    {
      title: "Unique Worksites",
      value: data ? formatNumber(Number(data.unique_worksites) || 0) : "0",
      rawValue: Number(data?.unique_worksites) || 0,
      previousValue: Number(previousData?.unique_worksites) || 0,
      icon: Building2,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      accent: "from-amber-500/80 to-amber-500/20",
      positiveIsGood: true,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="overflow-hidden border-border/60 bg-gradient-to-br from-card to-muted/20">
          <div className={`h-1.5 bg-gradient-to-r ${kpi.accent}`} />
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{kpi.title}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    {previousData && (
                      <div className="mt-1">
                        <TrendIndicator
                          current={kpi.rawValue}
                          previous={kpi.previousValue}
                          positiveIsGood={kpi.positiveIsGood}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className={`h-11 w-11 rounded-xl ${kpi.bgColor} flex items-center justify-center`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
