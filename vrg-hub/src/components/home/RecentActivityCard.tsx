import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, AlertCircle, FileText } from "lucide-react";

const recentItems = [
  { 
    title: "Hardware Request #1234", 
    status: "pending", 
    time: "2 hours ago",
    icon: FileText 
  },
  { 
    title: "IT Support Ticket resolved", 
    status: "completed", 
    time: "Yesterday",
    icon: CheckCircle2 
  },
  { 
    title: "Incident Report submitted", 
    status: "pending", 
    time: "2 days ago",
    icon: AlertCircle 
  },
  { 
    title: "Form submission approved", 
    status: "completed", 
    time: "3 days ago",
    icon: CheckCircle2 
  },
];

const statusStyles = {
  pending: "text-warning",
  completed: "text-status-approved",
};

export function RecentActivityCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentItems.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className={`mt-0.5 ${statusStyles[item.status]}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {item.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
