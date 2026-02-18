import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Page metadata configuration
const pageConfig: Record<string, { title: string; subtitle: string; accent?: string; dynamic?: boolean }> = {
  "/": { title: "Home", subtitle: "Your central hub for everything VRG", dynamic: true },
  "/requests": { title: "Requests", subtitle: "Manage and track all your requests", accent: "Requests" },
  "/requests/new": { title: "New Request", subtitle: "Create a new request", accent: "Request" },
  "/approvals": { title: "Approvals", subtitle: "Review and approve pending requests", accent: "Approvals" },
  "/mlo-dashboard": { title: "CRM Dashboard", subtitle: "Customer relationship management overview", accent: "Dashboard" },
  "/mlo-tasks": { title: "Tasks", subtitle: "Manage your MLO tasks and follow-ups", accent: "Tasks" },
  "/mlo-contacts": { title: "Contacts", subtitle: "View and manage your contacts", accent: "Contacts" },
  "/company-documents": { title: "File Directory", subtitle: "Access company documents and resources", accent: "Directory" },
  "/directory": { title: "Phone Directory", subtitle: "Find contact information for team members", accent: "Directory" },
  "/external-providers": { title: "External Providers", subtitle: "Directory of external healthcare providers", accent: "Providers" },
  "/rosters": { title: "Rosters", subtitle: "View team schedules and rosters", accent: "Rosters" },
  "/hr-assistance": { title: "HR & Employee Assistance", subtitle: "Human resources and support services", accent: "HR" },
  "/news": { title: "News", subtitle: "Latest updates and announcements", accent: "News" },
  "/newsletter": { title: "Monthly Newsletter", subtitle: "Stay informed with our monthly updates", accent: "Newsletter" },
  "/help": { title: "Help", subtitle: "Get support and find answers", accent: "Help" },
  "/referrer-lookup": { title: "Referrer Lookup", subtitle: "Search and find referrer information", accent: "Lookup" },
  "/radiology-search": { title: "Radiology Search", subtitle: "Search radiology records and reports", accent: "Search" },
  "/modality-management": { title: "Modality Details", subtitle: "Manage modality information and settings", accent: "Details" },
  "/audit-log": { title: "Audit Log", subtitle: "System activity and audit trail", accent: "Log" },
  "/integrations": { title: "Integrations", subtitle: "Manage system integrations and connections", accent: "Integrations" },
  "/analytics-ai": { title: "Analytics AI", subtitle: "Artificial intelligence powered analytics", accent: "AI" },
  "/executive-dashboard": { title: "Executive Dashboard", subtitle: "High-level business intelligence and analytics", accent: "Dashboard" },
  "/clinic-setup": { title: "Clinic Setup", subtitle: "Configure clinic settings and information", accent: "Setup" },
  "/settings": { title: "Settings", subtitle: "System configuration and preferences", accent: "Settings" },
  "/user-roles": { title: "User Management", subtitle: "Manage users, roles, and permissions", accent: "Management" },
  "/mission-statement": { title: "Mission Statement", subtitle: "Our vision, values, and purpose", accent: "Mission" },
};

export function PageHeader() {
  const location = useLocation();
  const { user } = useAuth();

  // Get page config based on current path
  let config = pageConfig[location.pathname] || {
    title: "VRG Hub",
    subtitle: "Vision Radiology Group Portal",
  };

  // Handle dynamic home page greeting
  if (location.pathname === "/" && config.dynamic) {
    const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
    config = {
      title: `${getGreeting()}, ${userName}`,
      subtitle: `${format(new Date(), "EEEE, MMMM d, yyyy")} • Welcome to VRG Hub`,
      accent: userName,
    };
  }

  // Split title to find accent word if specified
  const titleParts = config.accent
    ? config.title.split(config.accent)
    : [config.title];

  return (
    <div className="flex-1 min-w-0 pl-8">
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
        {titleParts[0]}
        {config.accent && (
          <span className="text-primary">{config.accent}</span>
        )}
        {titleParts[1]}
      </h1>
      <p className="text-sm md:text-base text-muted-foreground mt-1.5">
        {config.subtitle}
      </p>
      <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-3" />
    </div>
  );
}
