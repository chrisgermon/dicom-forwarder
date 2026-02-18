import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Activity, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModalityTargetBreakdown } from '@/lib/mloTargetUtils';

interface ModalityTargetsChartProps {
  modalityTargets: ModalityTargetBreakdown[];
  totalTarget: number;
  totalActual: number;
  title?: string;
  description?: string;
  showBarChart?: boolean;
}

export function ModalityTargetsChart({
  modalityTargets,
  totalTarget,
  totalActual,
  title = 'Target Breakdown by Modality',
  description,
}: ModalityTargetsChartProps) {
  const percentage = useMemo(() => {
    if (totalTarget <= 0) return 0;
    return Math.round((totalActual / totalTarget) * 100);
  }, [totalActual, totalTarget]);

  // Sort modalities by target descending for better visualization
  const sortedModalities = useMemo(() => {
    return [...modalityTargets]
      .filter(m => m.targetScans > 0 || (m.actualScans && m.actualScans > 0))
      .sort((a, b) => b.targetScans - a.targetScans);
  }, [modalityTargets]);

  if (modalityTargets.length === 0) {
    return (
      <Card className="border-l-4 border-l-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No modality targets set for this period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          <Badge 
            variant={percentage >= 100 ? 'default' : percentage >= 80 ? 'secondary' : 'destructive'}
            className={cn(
              "text-sm font-semibold",
              percentage >= 100 && "bg-emerald-500"
            )}
          >
            {percentage}% of target
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Total Target:</span>
            <span className="font-semibold">{totalTarget.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">Actual:</span>
            <span className="font-semibold text-emerald-600">{totalActual.toLocaleString()}</span>
          </div>
        </div>

        {/* Horizontal Progress Bars - Cleaner than grouped bar chart */}
        <div className="space-y-3">
          {sortedModalities.map((modality, index) => {
            const actual = modality.actualScans || 0;
            const target = modality.targetScans;
            const achievementPercent = target > 0 ? Math.round((actual / target) * 100) : 0;
            const isOverTarget = actual > target && target > 0;
            const overAmount = isOverTarget ? actual - target : 0;
            const displayPercent = Math.min(achievementPercent, 100);
            
            return (
              <div 
                key={modality.modalityId}
                className={cn(
                  "p-3 rounded-lg border transition-all duration-300 animate-fade-in",
                  isOverTarget && "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: isOverTarget ? '#10b981' : modality.color }}
                    />
                    <span className="font-medium text-sm">{modality.modalityName}</span>
                    {isOverTarget && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isOverTarget ? (
                      <Badge variant="default" className="bg-emerald-500 text-xs">
                        +{Math.round((overAmount / target) * 100)}% over
                      </Badge>
                    ) : (
                      <Badge variant={achievementPercent >= 80 ? "secondary" : "outline"} className="text-xs">
                        {achievementPercent}%
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Progress bar with target marker */}
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "absolute h-full rounded-full transition-all duration-500",
                      isOverTarget ? "bg-emerald-500" : achievementPercent >= 80 ? "bg-primary" : "bg-amber-500"
                    )}
                    style={{ width: `${displayPercent}%` }}
                  />
                </div>
                
                {/* Values row */}
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-muted-foreground">
                    Target: <span className="font-semibold text-foreground">{target.toLocaleString()}</span>
                  </span>
                  <span className={cn(
                    "font-semibold",
                    isOverTarget ? "text-emerald-600" : "text-foreground"
                  )}>
                    Actual: {actual.toLocaleString()}
                    {isOverTarget && (
                      <span className="text-emerald-500 ml-1">(+{overAmount.toLocaleString()})</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
