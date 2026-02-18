import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  Building2,
  Users,
  Laptop,
  FileText,
  Folder,
  ChevronRight,
} from "lucide-react";

interface QuickLink {
  name: string;
  path: string;
  description: string;
  icon?: string;
}

interface DepartmentView {
  id: string;
  name: string;
  icon: typeof Stethoscope;
  color: string;
  quickLinks: QuickLink[];
  pinnedFolders: string[];
}

// Department configurations for Vision Radiology Group
export const DEPARTMENT_VIEWS: Record<string, DepartmentView> = {
  radiology: {
    id: 'radiology',
    name: 'Radiology',
    icon: Stethoscope,
    color: 'text-primary',
    quickLinks: [
      {
        name: 'Imaging Protocols',
        path: '/Radiology/Protocols',
        description: 'CT, MRI, X-Ray protocols',
      },
      {
        name: 'Equipment Manuals',
        path: '/Radiology/Equipment',
        description: 'Operation and maintenance guides',
      },
      {
        name: 'Safety Guidelines',
        path: '/Radiology/Safety',
        description: 'Radiation safety and HIPAA compliance',
      },
      {
        name: 'Quality Assurance',
        path: '/Radiology/QA',
        description: 'QA procedures and checklists',
      },
    ],
    pinnedFolders: [
      '/Radiology/Protocols',
      '/Radiology/Equipment',
      '/Radiology/Safety',
      '/Clinical/Forms',
    ],
  },
  admin: {
    id: 'admin',
    name: 'Administration',
    icon: Building2,
    color: 'text-success',
    quickLinks: [
      {
        name: 'Policies & Procedures',
        path: '/Admin/Policies',
        description: 'Company policies and procedures',
      },
      {
        name: 'Financial Documents',
        path: '/Admin/Finance',
        description: 'Budgets, reports, and invoices',
      },
      {
        name: 'Vendor Contracts',
        path: '/Admin/Contracts',
        description: 'Vendor agreements and contracts',
      },
      {
        name: 'Meeting Minutes',
        path: '/Admin/Meetings',
        description: 'Board and management meeting minutes',
      },
    ],
    pinnedFolders: [
      '/Admin/Policies',
      '/Admin/Finance',
      '/Admin/Contracts',
      '/HR/Employee Files',
    ],
  },
  hr: {
    id: 'hr',
    name: 'Human Resources',
    icon: Users,
    color: 'text-warning',
    quickLinks: [
      {
        name: 'Employee Files',
        path: '/HR/Employee Files',
        description: 'Personnel records and documents',
      },
      {
        name: 'Training Materials',
        path: '/HR/Training',
        description: 'Onboarding and ongoing training',
      },
      {
        name: 'Policy Documents',
        path: '/HR/Policies',
        description: 'HR policies and handbooks',
      },
      {
        name: 'Recruitment',
        path: '/HR/Recruitment',
        description: 'Job descriptions and applications',
      },
    ],
    pinnedFolders: [
      '/HR/Employee Files',
      '/HR/Training',
      '/HR/Policies',
      '/Admin/Policies',
    ],
  },
  it: {
    id: 'it',
    name: 'Information Technology',
    icon: Laptop,
    color: 'text-info',
    quickLinks: [
      {
        name: 'System Documentation',
        path: '/IT/Systems',
        description: 'Network and system documentation',
      },
      {
        name: 'Equipment Inventory',
        path: '/IT/Equipment',
        description: 'Hardware and software inventory',
      },
      {
        name: 'Vendor Documentation',
        path: '/IT/Vendors',
        description: 'Vendor contacts and licenses',
      },
      {
        name: 'Security Policies',
        path: '/IT/Security',
        description: 'Cybersecurity and data protection',
      },
    ],
    pinnedFolders: [
      '/IT/Systems',
      '/IT/Equipment',
      '/IT/Security',
      '/Radiology/Equipment',
    ],
  },
  clinical: {
    id: 'clinical',
    name: 'Clinical',
    icon: FileText,
    color: 'text-purple-600',
    quickLinks: [
      {
        name: 'Patient Forms',
        path: '/Clinical/Forms',
        description: 'Consent forms and patient documents',
      },
      {
        name: 'Clinical Guidelines',
        path: '/Clinical/Guidelines',
        description: 'Treatment protocols and guidelines',
      },
      {
        name: 'Incident Reports',
        path: '/Clinical/Incidents',
        description: 'Incident reports and investigations',
      },
      {
        name: 'Quality Metrics',
        path: '/Clinical/Metrics',
        description: 'Clinical quality metrics and KPIs',
      },
    ],
    pinnedFolders: [
      '/Clinical/Forms',
      '/Clinical/Guidelines',
      '/Radiology/Protocols',
      '/Radiology/Safety',
    ],
  },
};

interface DepartmentViewsProps {
  userDepartment?: string;
  onNavigate: (path: string) => void;
  onPinFolder?: (path: string) => void;
}

/**
 * Department-Specific Views Component
 * Shows customized quick links and recommendations based on user's department
 */
export function DepartmentViews({
  userDepartment,
  onNavigate,
  onPinFolder,
}: DepartmentViewsProps) {
  // Auto-detect or use provided department
  const departmentId = userDepartment || detectUserDepartment();
  const departmentView = departmentId ? DEPARTMENT_VIEWS[departmentId] : null;

  if (!departmentView) {
    return null; // Show nothing if department not detected
  }

  const Icon = departmentView.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${departmentView.color}`} />
          <CardTitle className="text-base">{departmentView.name} Quick Access</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            Your Department
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {departmentView.quickLinks.map((link, index) => (
          <div
            key={index}
            className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer"
            onClick={() => onNavigate(link.path)}
          >
            <Folder className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{link.name}</p>
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {link.description}
              </p>
            </div>
          </div>
        ))}

        {onPinFolder && (
          <div className="pt-2 mt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              Recommended folders for {departmentView.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {departmentView.pinnedFolders.map((folder, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onPinFolder(folder)}
                  className="text-xs h-7"
                >
                  Pin {folder.split('/').pop()}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Detects user's department from auth context or profile
 * In production, this would read from user's profile in the database
 */
function detectUserDepartment(): string | null {
  // TODO: Implement actual department detection from user profile
  // For now, return null to disable auto-detection
  // Example implementation:
  // const { user } = useAuth();
  // return user?.user_metadata?.department || null;

  // For demo purposes, you can hardcode a department:
  // return 'radiology';

  return null;
}

/**
 * Compact Department Banner
 * Shows a small banner at the top of the page with department name and quick links
 */
export function DepartmentBanner({
  userDepartment,
  onNavigate,
}: {
  userDepartment?: string;
  onNavigate: (path: string) => void;
}) {
  const departmentId = userDepartment || detectUserDepartment();
  const departmentView = departmentId ? DEPARTMENT_VIEWS[departmentId] : null;

  if (!departmentView) {
    return null;
  }

  const Icon = departmentView.icon;

  return (
    <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-background`}>
          <Icon className={`h-5 w-5 ${departmentView.color}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{departmentView.name} Resources</p>
          <p className="text-xs text-muted-foreground">
            Quick access to your department's most used folders
          </p>
        </div>
        <div className="flex gap-1">
          {departmentView.quickLinks.slice(0, 3).map((link, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onNavigate(link.path)}
              className="text-xs h-7 hidden sm:inline-flex"
            >
              {link.name.replace('Imaging ', '').replace('Equipment ', '')}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
