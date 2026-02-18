import { Building2, Users, Megaphone, Briefcase, DollarSign, HeadphonesIcon, Settings2 } from "lucide-react";

const departments = [
  { name: "Reception", icon: Building2, href: "#" },
  { name: "Medical", icon: Users, href: "#" },
  { name: "Marketing", icon: Megaphone, href: "#" },
  { name: "HR", icon: Briefcase, href: "#" },
  { name: "Finance", icon: DollarSign, href: "#" },
  { name: "Operations", icon: Settings2, href: "#" },
];

export function DepartmentLinksFooter() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {departments.map((dept) => (
          <a
            key={dept.name}
            href={dept.href}
            className="group flex flex-col items-center justify-center p-6 bg-card rounded-xl border border-border/50 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-200"
          >
            <div className="p-3 rounded-full bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
              <dept.icon className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-foreground text-center">
              {dept.name}
            </span>
          </a>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-status-approved animate-pulse" />
          All Systems Operational
        </div>
        <a 
          href="/support" 
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <HeadphonesIcon className="h-4 w-4" />
          IT Support
        </a>
      </div>
    </div>
  );
}
