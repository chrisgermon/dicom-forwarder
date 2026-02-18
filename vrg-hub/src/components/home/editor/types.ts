export interface Widget {
  id: string;
  type: "dynamic-hero" | "welcome" | "quick-actions" | "news-feed" | "notifications" | "recent-activity" | "quick-links" | "company-info" | "text-block" | "stats-card" | "helpdesk-tickets" | "pending-approvals" | "request-metrics" | "office365-links" | "super-admin-stats" | "recent-requests";
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
}

export interface WidgetType {
  type: Widget["type"];
  label: string;
  description: string;
  icon: string;
  defaultSize: { width: number; height: number };
}
