import { Card } from "@/components/ui/card";
import { Mail, HardDrive, FileText, Table } from "lucide-react";

const office365Apps = [
  {
    name: "Outlook",
    url: "https://outlook.office.com",
    icon: Mail,
    color: "from-blue-500 to-blue-600",
  },
  {
    name: "OneDrive",
    url: "https://www.office.com/launch/onedrive",
    icon: HardDrive,
    color: "from-blue-400 to-blue-500",
  },
  {
    name: "Word",
    url: "https://www.office.com/launch/word",
    icon: FileText,
    color: "from-blue-600 to-blue-700",
  },
  {
    name: "Excel",
    url: "https://www.office.com/launch/excel",
    icon: Table,
    color: "from-green-600 to-green-700",
  },
];

export function Office365QuickLinks() {
  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <h3 className="text-lg font-semibold mb-4">Quick Access to Office 365</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {office365Apps.map((app) => (
          <a
            key={app.name}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-all duration-200 hover:scale-[1.02]"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center mb-3 group-hover:shadow-lg transition-shadow`}>
              <app.icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-foreground">{app.name}</span>
          </a>
        ))}
      </div>
    </Card>
  );
}
