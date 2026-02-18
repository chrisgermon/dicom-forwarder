import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * Meta-inspired underline tabs component
 * Clean, minimal tab styling with underline indicator
 */

const UnderlineTabs = TabsPrimitive.Root;

const UnderlineTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex items-center gap-0 border-b",
      className
    )}
    {...props}
  />
));
UnderlineTabsList.displayName = "UnderlineTabsList";

const UnderlineTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative flex items-center h-11 px-4 text-sm font-medium",
      "text-muted-foreground hover:text-foreground transition-colors",
      "data-[state=active]:text-primary",
      // Underline indicator
      "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px]",
      "after:bg-primary after:scale-x-0 after:transition-transform after:duration-200",
      "data-[state=active]:after:scale-x-100",
      className
    )}
    {...props}
  />
));
UnderlineTabsTrigger.displayName = "UnderlineTabsTrigger";

export { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger };
