import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.02]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground shadow-md hover:shadow-lg hover:scale-[1.02]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-md hover:shadow-lg hover:scale-[1.02]",
        outline:
          "border-2 border-primary text-primary bg-background/50 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground shadow-sm hover:shadow-md",
        success:
          "border-transparent bg-success text-success-foreground shadow-md hover:shadow-lg hover:scale-[1.02]",
        warning:
          "border-transparent bg-warning text-warning-foreground shadow-md hover:shadow-lg hover:scale-[1.02]",
        info:
          "border-transparent bg-info text-info-foreground shadow-md hover:shadow-lg hover:scale-[1.02]",
        glass:
          "border-border/50 bg-background/60 text-foreground backdrop-blur-md shadow-sm hover:bg-background/70",
        premium:
          "border-transparent bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }