import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, FileText, ClipboardCheck, FolderOpen, Link as LinkIcon } from "lucide-react";

const linkGroups = [
  {
    title: "Forms",
    links: [
      { label: "Ultrasound Worksheets", href: "#", icon: FileSpreadsheet },
      { label: "Quick Forms", href: "/forms", icon: ClipboardCheck },
      { label: "Attendance Certificate", href: "#", icon: FileText },
    ],
  },
  {
    title: "Documents",
    links: [
      { label: "Excel Templates", href: "#", icon: FileSpreadsheet },
      { label: "Common Documents", href: "/documents", icon: FolderOpen },
    ],
  },
];

export function QuickLinksCard() {
  return (
    <Card variant="glass" className="h-full bg-card dark:bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
          Quick Links
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.title}
              </h4>
              <div className="space-y-1">
                {group.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="flex items-center gap-2 p-2 -mx-1 rounded-lg hover:bg-muted/60 transition-colors duration-100 text-sm text-foreground hover:text-primary"
                  >
                    <link.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
