import { Building2, Users, Megaphone, Briefcase, DollarSign, Settings2 } from "lucide-react";

const departments = [
  { name: "Reception", icon: Building2, href: "#" },
  { name: "Medical", icon: Users, href: "#" },
  { name: "Marketing", icon: Megaphone, href: "#" },
  { name: "HR", icon: Briefcase, href: "#" },
  { name: "Finance", icon: DollarSign, href: "#" },
  { name: "Operations", icon: Settings2, href: "#" },
];

export function DepartmentLinksSidebar() {
  return (
    <div className="flex flex-col gap-3">
      {departments.map((dept) => (
        <a
          key={dept.name}
          href={dept.href}
          className="group flex flex-col items-center justify-center p-4 bg-secondary/50 rounded-xl border border-secondary shadow-card hover:shadow-elevated hover:-translate-y-0.5 hover:bg-secondary transition-all duration-200"
        >
          <div className="p-3 rounded-full bg-accent/20 text-accent-foreground mb-2 group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-200">
            <dept.icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-foreground text-center">
            {dept.name}
          </span>
        </a>
      ))}
    </div>
  );
}
