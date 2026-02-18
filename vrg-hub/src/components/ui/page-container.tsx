import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[1600px]",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
};

/**
 * Standardized page container component
 * Provides consistent spacing and max-width across all pages
 */
const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, maxWidth = "lg", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "container mx-auto px-4 md:px-6 py-6",
          maxWidthClasses[maxWidth],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PageContainer.displayName = "PageContainer";

export { PageContainer };
