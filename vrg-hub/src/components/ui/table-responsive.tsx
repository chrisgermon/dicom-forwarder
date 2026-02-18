import * as React from "react"
import { cn } from "@/lib/utils"

const ResponsiveTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full overflow-x-auto rounded-lg border hide-mobile", className)}
    {...props}
  />
))
ResponsiveTable.displayName = "ResponsiveTable"

const ResponsiveTableWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("w-full", className)} {...props}>
    {children}
  </div>
))
ResponsiveTableWrapper.displayName = "ResponsiveTableWrapper"

export { ResponsiveTable, ResponsiveTableWrapper }
