import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown } from "lucide-react";

interface MloPerformanceGaugeProps {
  mloName: string;
  actualProcedures: number;
  targetProcedures: number;
  periodLabel: string;
}

export function MloPerformanceGauge({ 
  mloName, 
  actualProcedures, 
  targetProcedures, 
  periodLabel 
}: MloPerformanceGaugeProps) {
  const percentage = useMemo(() => {
    if (targetProcedures <= 0) return 0;
    return Math.min(100, Math.round((actualProcedures / targetProcedures) * 100));
  }, [actualProcedures, targetProcedures]);

  const isOnTrack = percentage >= 80;
  const isWarning = percentage >= 50 && percentage < 80;

  const getProgressColor = () => {
    if (percentage >= 100) return "bg-green-500";
    if (isOnTrack) return "bg-emerald-500";
    if (isWarning) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          {mloName} - Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{periodLabel}</span>
          <div className="flex items-center gap-1">
            {isOnTrack ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-amber-500" />
            )}
            <span className={`font-bold ${isOnTrack ? 'text-green-600' : isWarning ? 'text-amber-600' : 'text-red-600'}`}>
              {percentage}%
            </span>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className={`h-full transition-all ${getProgressColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Actual: </span>
            <span className="font-semibold">{actualProcedures.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Target: </span>
            <span className="font-semibold">{targetProcedures.toLocaleString()}</span>
          </div>
        </div>

        {targetProcedures === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No targets set for this period
          </p>
        )}
      </CardContent>
    </Card>
  );
}
