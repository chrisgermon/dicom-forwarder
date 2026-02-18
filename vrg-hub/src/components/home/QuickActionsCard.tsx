import { FileText, AlertTriangle, Wrench, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const actions = [
  { 
    label: "New Request", 
    icon: FileText, 
    variant: "default" as const,
    href: "/requests/new",
    className: "bg-primary hover:bg-primary/90"
  },
  { 
    label: "Report Incident", 
    icon: AlertTriangle, 
    variant: "default" as const,
    href: "/incidents/new",
    className: "bg-warning hover:bg-warning/90 text-warning-foreground"
  },
  { 
    label: "Maintenance Request", 
    icon: Wrench, 
    variant: "outline" as const,
    href: "/requests/new?type=maintenance",
    className: ""
  },
  { 
    label: "Submit Form", 
    icon: ClipboardList, 
    variant: "outline" as const,
    href: "/forms",
    className: ""
  },
];

export function QuickActionsCard() {
  const navigate = useNavigate();

  return (
    <Card variant="glass" className="h-full bg-card dark:bg-transparent">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              className={`h-auto py-4 flex flex-col items-center gap-2 ${action.className}`}
              onClick={() => navigate(action.href)}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
