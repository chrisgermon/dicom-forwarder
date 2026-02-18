import { Badge } from "@/components/ui/badge";

export type OrderStatus = "draft" | "submitted" | "approved" | "declined" | "ordered";

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusLabels: Record<OrderStatus, string> = {
  draft: "Draft",
  submitted: "Submitted", 
  approved: "Approved",
  declined: "Declined",
  ordered: "Ordered"
};

const statusVariants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "glass" | "premium"> = {
  draft: "secondary",
  submitted: "info",
  approved: "success",
  declined: "destructive",
  ordered: "premium"
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status]} className={className}>
      {statusLabels[status]}
    </Badge>
  );
}