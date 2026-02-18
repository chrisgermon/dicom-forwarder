import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  current: number;
  previous: number;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TrendIndicator({ 
  current, 
  previous, 
  showPercentage = true,
  size = "sm",
  className 
}: TrendIndicatorProps) {
  const diff = current - previous;
  const percentChange = previous > 0 
    ? Math.round(((current - previous) / previous) * 100) 
    : current > 0 ? 100 : 0;

  const isUp = diff > 0;
  const isDown = diff < 0;
  const isNeutral = diff === 0;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (previous === 0 && current === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 font-medium animate-fade-in",
        sizeClasses[size],
        isUp && "text-emerald-600 dark:text-emerald-400",
        isDown && "text-red-600 dark:text-red-400",
        isNeutral && "text-muted-foreground",
        className
      )}
    >
      {isUp && <TrendingUp className={cn(iconSizes[size], "animate-scale-in")} />}
      {isDown && <TrendingDown className={cn(iconSizes[size], "animate-scale-in")} />}
      {isNeutral && <Minus className={cn(iconSizes[size])} />}
      {showPercentage && (
        <span>
          {isUp && "+"}
          {percentChange}%
        </span>
      )}
    </div>
  );
}

interface TrendBadgeProps {
  current: number;
  previous: number;
  label?: string;
  className?: string;
}

export function TrendBadge({ current, previous, label, className }: TrendBadgeProps) {
  const diff = current - previous;
  const percentChange = previous > 0 
    ? Math.round(((current - previous) / previous) * 100) 
    : current > 0 ? 100 : 0;

  const isUp = diff > 0;
  const isDown = diff < 0;

  if (previous === 0 && current === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium animate-scale-in",
        isUp && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        isDown && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        !isUp && !isDown && "bg-muted text-muted-foreground",
        className
      )}
    >
      {isUp && <TrendingUp className="h-3 w-3" />}
      {isDown && <TrendingDown className="h-3 w-3" />}
      {!isUp && !isDown && <Minus className="h-3 w-3" />}
      <span>
        {isUp && "+"}
        {percentChange}%
        {label && ` ${label}`}
      </span>
    </div>
  );
}
