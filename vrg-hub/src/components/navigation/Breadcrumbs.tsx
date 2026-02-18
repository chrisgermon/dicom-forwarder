import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  // Page name mappings
  const pageNames: Record<string, string> = {
    'requests': 'Requests',
    'new': 'New Request',
    'approvals': 'Approvals',
    'checklist': 'Daily Checklist',
    'mlo-dashboard': 'CRM Dashboard',
    'mlo-contacts': 'Contacts',
    'mlo-communications': 'Communications',
    'mlo-tasks': 'CRM Tasks',
    'mlo-pipeline': 'Pipeline',
    'mlo-targets': 'Targets & Worksites',
    'mlo-performance': 'Performance',
    'marketing-campaigns': 'Marketing Campaigns',
    'marketing-calendar': 'Marketing Calendar',
    'company-documents': 'File Directory',
    'directory': 'Phone Directory',
    'mission-statement': 'Mission Statement',
    'external-providers': 'External Providers',
    'rosters': 'Rosters',
    'hr-assistance': 'HR & Employee Assistance',
    'referrer-lookup': 'Referrer Lookup',
    'modality-management': 'Modality Details',
    'news': 'News',
    'newsletter': 'Monthly Newsletter',
    'help': 'Help',
    'clinic-setup': 'Clinic Setup',
    'settings': 'Settings',
    'user-roles': 'User Management',
    'radiology-search': 'Radiology Search',
    'audit-log': 'Audit Log',
    'integrations': 'Integrations',
    'analytics-ai': 'Analytics AI',
    'print-orders': 'Print Order Forms',
    'reminders': 'Reminders',
  };

  if (pathnames.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Home className="h-4 w-4 text-primary" />
        <span className="font-semibold text-foreground">Home</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
        <span>Home</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = pageNames[value] || value.charAt(0).toUpperCase() + value.slice(1);

        return (
          <Fragment key={to}>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            {isLast ? (
              <span className="font-semibold text-foreground">{displayName}</span>
            ) : (
              <Link to={to} className="text-muted-foreground hover:text-foreground transition-colors">
                {displayName}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
