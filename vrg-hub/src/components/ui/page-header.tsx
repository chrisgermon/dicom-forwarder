import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  gradient?: boolean;
  className?: string;
  /** Use compact Meta-style header (no gradient, clean border) */
  variant?: "default" | "clean";
}

/**
 * Standardized page header component
 * Provides consistent title, description, and action layout
 * 
 * Use variant="clean" for Meta-inspired minimal styling
 */
export function PageHeader({
  title,
  description,
  actions,
  gradient = false,
  variant = "clean",
  className,
}: PageHeaderProps) {
  const isClean = variant === "clean" || !gradient;

  return (
    <div
      className={cn(
        "mb-6 transition-all duration-200",
        isClean 
          ? "border-b pb-4" 
          : "rounded-2xl p-6 bg-gradient-to-r from-primary/5 via-transparent to-accent/5",
        className
      )}
    >
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <h1 className={cn(
            "font-semibold tracking-tight",
            isClean ? "text-xl" : "text-3xl font-bold mb-2"
          )}>
            {title}
          </h1>
          {description && (
            <p className={cn(
              "text-muted-foreground",
              isClean ? "text-sm mt-1" : "mt-2"
            )}>
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}