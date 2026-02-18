import { Card } from "@/components/ui/card";
// Button import removed - not currently used
import * as LucideIcons from "lucide-react";
import type { Widget, WidgetType } from "./types";

const widgetTypes: WidgetType[] = [
  {
    type: "dynamic-hero",
    label: "Smart Hero",
    description: "Announcements and action items",
    icon: "Megaphone",
    defaultSize: { width: 12, height: 2 },
  },
  {
    type: "welcome",
    label: "Welcome Banner",
    description: "Personalized welcome message",
    icon: "WavesLadder",
    defaultSize: { width: 12, height: 2 },
  },
  {
    type: "quick-actions",
    label: "Quick Actions",
    description: "Customizable action buttons",
    icon: "Zap",
    defaultSize: { width: 12, height: 2 },
  },
  {
    type: "news-feed",
    label: "News Feed",
    description: "Latest news articles",
    icon: "Newspaper",
    defaultSize: { width: 8, height: 6 },
  },
  {
    type: "notifications",
    label: "Notifications",
    description: "Recent notifications",
    icon: "Bell",
    defaultSize: { width: 4, height: 3 },
  },
  {
    type: "recent-activity",
    label: "Recent Activity",
    description: "User activity timeline",
    icon: "Activity",
    defaultSize: { width: 8, height: 4 },
  },
  {
    type: "quick-links",
    label: "Quick Links",
    description: "Important links",
    icon: "Link",
    defaultSize: { width: 4, height: 3 },
  },
  {
    type: "company-info",
    label: "Company Info",
    description: "Organization details",
    icon: "Building2",
    defaultSize: { width: 4, height: 3 },
  },
  {
    type: "text-block",
    label: "Text Block",
    description: "Custom text content",
    icon: "Type",
    defaultSize: { width: 6, height: 3 },
  },
  {
    type: "stats-card",
    label: "Stats Card",
    description: "Metrics and statistics",
    icon: "TrendingUp",
    defaultSize: { width: 4, height: 2 },
  },
  {
    type: "pending-approvals",
    label: "Pending Approvals",
    description: "Requests awaiting approval",
    icon: "CheckCircle2",
    defaultSize: { width: 6, height: 3 },
  },
  {
    type: "request-metrics",
    label: "Request Metrics",
    description: "Overview of request statistics",
    icon: "BarChart3",
    defaultSize: { width: 12, height: 3 },
  },
  {
    type: "office365-links",
    label: "Office 365 Quick Links",
    description: "Quick access to Office 365 apps",
    icon: "Grid3x3",
    defaultSize: { width: 12, height: 2 },
  },
  {
    type: "super-admin-stats",
    label: "Super Admin Stats",
    description: "Platform-wide statistics (Super Admin only)",
    icon: "Shield",
    defaultSize: { width: 12, height: 3 },
  },
  {
    type: "recent-requests",
    label: "Recent Requests",
    description: "Your most recent hardware requests",
    icon: "FileText",
    defaultSize: { width: 12, height: 4 },
  },
];

interface WidgetPaletteProps {
  onAddWidget: (type: Widget["type"]) => void;
}

export function WidgetPalette({ onAddWidget }: WidgetPaletteProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm mb-3">Components</h3>
      {widgetTypes.map((widgetType) => {
        const IconComponent = (LucideIcons as any)[widgetType.icon];
        return (
          <Card
            key={widgetType.type}
            className="p-3 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => onAddWidget(widgetType.type)}
          >
            <div className="flex items-start gap-2">
              {IconComponent && <IconComponent className="h-4 w-4 mt-0.5 text-primary" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{widgetType.label}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {widgetType.description}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
