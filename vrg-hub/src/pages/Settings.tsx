import { Fragment, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { SystemStatusManager } from '@/components/settings/SystemStatusManager';
import { SystemBannerManager } from '@/components/banners/SystemBannerManager';
import { ApprovalWorkflowManager } from '@/components/workflows/ApprovalWorkflowManager';
import { CompanySettings } from '@/components/CompanySettings';
import { MenuEditor } from '@/components/settings/MenuEditor';
import { BrandsManager } from '@/components/settings/BrandsManager';
import { LocationsManager } from '@/components/settings/LocationsManager';
import { NotificationSettingsManager } from '@/components/settings/NotificationSettingsManager';
import { RequestNotificationAssignments } from '@/components/settings/RequestNotificationAssignments';
import { PrintBrandsManager } from '@/components/settings/PrintBrandsManager';
import { CompanyDomainsManager } from '@/components/settings/CompanyDomainsManager';
import { CompanyFeaturesManager } from '@/components/settings/CompanyFeaturesManager';
import { ReminderSettingsManager } from '@/components/settings/ReminderSettingsManager';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { APP_VERSION, BUILD_DATE } from '@/lib/version';
import { TestsTab } from '@/components/settings/TestsTab';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import {
  Info,
  Palette,
  Tags,
  MapPin,
  Sparkles,
  Building2,
  Users,
  FileText,
  Bell,
  Menu,
  Clock,
  Settings as SettingsIcon,
  FlaskConical,
  ChevronRight,
  Edit,
} from 'lucide-react';

interface SettingsSection {
  value: string;
  label: string;
  description: string;
  icon: React.ElementType;
  allowed: boolean;
  content: React.ReactNode;
}

export default function Settings() {
  const { userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('general');

  const isSuperAdmin = userRole === 'super_admin';
  const isTenantAdmin = userRole === 'tenant_admin';
  const isAdmin = isSuperAdmin || isTenantAdmin;
  const canManageReminderSettings = hasPermission('manage_reminder_settings') || isAdmin;

  useEffect(() => {
    // Force light theme
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('theme', 'light');
  }, []);

  const sections: SettingsSection[] = [
    {
      value: 'general',
      label: 'General',
      description: 'Application information',
      icon: Info,
      allowed: true,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">General</h2>
            <p className="text-muted-foreground">Application information and about</p>
          </div>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About This Application</CardTitle>
              <CardDescription>Version and build information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono font-medium bg-muted px-2 py-1 rounded">{APP_VERSION}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Build Date</span>
                  <span className="font-mono font-medium bg-muted px-2 py-1 rounded">{BUILD_DATE}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Environment</span>
                  <span className="font-mono font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">beta</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      value: 'branding',
      label: 'Branding',
      description: 'Logo, colors and themes',
      icon: Palette,
      allowed: isAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Branding</h2>
            <p className="text-muted-foreground">Customize your company's look and feel</p>
          </div>
          <Separator />
          <CompanySettings />
        </div>
      ),
    },
    {
      value: 'brands',
      label: 'Brands',
      description: 'Manage product brands',
      icon: Tags,
      allowed: isAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Brands</h2>
            <p className="text-muted-foreground">Manage your organization's brands</p>
          </div>
          <Separator />
          <BrandsManager />
        </div>
      ),
    },
    {
      value: 'locations',
      label: 'Locations',
      description: 'Office and site locations',
      icon: MapPin,
      allowed: isAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Locations</h2>
            <p className="text-muted-foreground">Manage office and site locations</p>
          </div>
          <Separator />
          <LocationsManager />
        </div>
      ),
    },
    {
      value: 'features',
      label: 'Features',
      description: 'Enable or disable features',
      icon: Sparkles,
      allowed: isAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Features</h2>
            <p className="text-muted-foreground">Control which features are enabled</p>
          </div>
          <Separator />
          <CompanyFeaturesManager />
        </div>
      ),
    },
    {
      value: 'company',
      label: 'Company',
      description: 'Domains and print settings',
      icon: Building2,
      allowed: isAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Company</h2>
            <p className="text-muted-foreground">Manage domains and print brand settings</p>
          </div>
          <Separator />
          <div className="space-y-6">
            <CompanyDomainsManager />
            <PrintBrandsManager />
          </div>
        </div>
      ),
    },
    {
      value: 'users',
      label: 'Users & Roles',
      description: 'User management and RBAC',
      icon: Users,
      allowed: isAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Users & Roles</h2>
            <p className="text-muted-foreground">Manage user roles and permissions with RBAC</p>
          </div>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User & Role Management</CardTitle>
              <CardDescription>Centralized role-based access control for all users and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure user roles, assign permissions, and manage individual user access overrides.
                  The RBAC system provides fine-grained control over what each user can see and do.
                </p>
                <Button onClick={() => navigate('/user-roles')} className="w-full sm:w-auto">
                  <Edit className="w-4 h-4 mr-2" />
                  Manage Users & Roles
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      value: 'forms',
      label: 'Request Forms',
      description: 'Form templates and categories',
      icon: FileText,
      allowed: isAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Request Forms</h2>
            <p className="text-muted-foreground">Create and manage request form templates</p>
          </div>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Forms & Categories</CardTitle>
              <CardDescription>Create and manage forms for each request category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Manage request types, categories, and their associated form templates. Use the form builder
                  to create custom fields and layouts for each type of request.
                </p>
                <Button onClick={() => navigate('/form-templates')} className="w-full sm:w-auto">
                  <Edit className="w-4 h-4 mr-2" />
                  Manage Request Forms
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      value: 'notifications',
      label: 'Notifications',
      description: 'Email and push settings',
      icon: Bell,
      allowed: isAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Notifications</h2>
            <p className="text-muted-foreground">Configure notification preferences and assignments</p>
          </div>
          <Separator />
          <div className="space-y-6">
            {(isSuperAdmin || isTenantAdmin) && <RequestNotificationAssignments />}
            <NotificationSettingsManager />
          </div>
        </div>
      ),
    },
    {
      value: 'menu',
      label: 'Menu',
      description: 'Navigation menu editor',
      icon: Menu,
      allowed: isAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Menu</h2>
            <p className="text-muted-foreground">Customize the navigation menu</p>
          </div>
          <Separator />
          <MenuEditor />
        </div>
      ),
    },
    {
      value: 'reminders',
      label: 'Reminders',
      description: 'Reminder schedule settings',
      icon: Clock,
      allowed: canManageReminderSettings,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Reminders</h2>
            <p className="text-muted-foreground">Configure reminder schedules and settings</p>
          </div>
          <Separator />
          <ReminderSettingsManager />
        </div>
      ),
    },
    {
      value: 'system',
      label: 'System',
      description: 'System status and workflows',
      icon: SettingsIcon,
      allowed: isSuperAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">System</h2>
            <p className="text-muted-foreground">System status, banners, and workflows</p>
          </div>
          <Separator />
          <div className="space-y-6">
            <SystemStatusManager />
            <SystemBannerManager />
            <ApprovalWorkflowManager />
          </div>
        </div>
      ),
    },
    {
      value: 'tests',
      label: 'Tests',
      description: 'Testing and diagnostics',
      icon: FlaskConical,
      allowed: isAdmin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Tests</h2>
            <p className="text-muted-foreground">Testing and diagnostic tools</p>
          </div>
          <Separator />
          <TestsTab />
        </div>
      ),
    },
  ].filter((section) => section.allowed);

  // Set default to first allowed section
  useEffect(() => {
    if (sections.length > 0 && !sections.find(s => s.value === activeSection)) {
      setActiveSection(sections[0].value);
    }
  }, [sections, activeSection]);

  const activeContent = sections.find(s => s.value === activeSection)?.content;

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="Settings"
        description="Manage your application preferences and configuration"
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <Card className="sticky top-4">
            <ScrollArea className="h-auto md:h-[calc(100vh-200px)]">
              <nav className="p-2">
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.value;

                  return (
                    <Fragment key={section.value}>
                      {index > 0 && index % 4 === 0 && (
                        <Separator className="my-2" />
                      )}
                      <button
                        onClick={() => setActiveSection(section.value)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground"
                        )}
                      >
                        <Icon className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-medium text-sm truncate",
                            isActive ? "text-primary-foreground" : "text-foreground"
                          )}>
                            {section.label}
                          </div>
                          <div className={cn(
                            "text-xs truncate",
                            isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {section.description}
                          </div>
                        </div>
                        <ChevronRight className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          isActive ? "text-primary-foreground rotate-0" : "text-muted-foreground opacity-0"
                        )} />
                      </button>
                    </Fragment>
                  );
                })}
              </nav>
            </ScrollArea>
          </Card>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <Card className="min-h-[calc(100vh-200px)]">
            <CardContent className="p-6">
              {activeContent}
            </CardContent>
          </Card>
        </main>
      </div>
    </PageContainer>
  );
}
