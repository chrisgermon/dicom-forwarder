import { useState, useMemo } from 'react';
import { 
  BookOpen, HelpCircle, ListChecks, Network, ShoppingCart, Mail, UserPlus, 
  CheckCircle, Clock, Settings, Users, FileText, Bell, Shield, 
  Database, Newspaper, Printer, Phone,
  Building2, DollarSign, 
  GraduationCap, Laptop, Briefcase, Menu, X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/ui/page-container';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { useAccessControl } from '@/hooks/useAccessControl';
import { APP_VERSION } from '@/lib/version';

const Help = () => {
  const [showIndex, setShowIndex] = useState(true);
  const { isFeatureEnabled } = useCompanyFeatures();
  const { hasPermission, hasAnyPermission, isSuperAdmin } = useAccessControl();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Map sections to their required features and permissions
  const sectionFeatureMap: Record<string, string | null> = {
    'getting-started': null,
    'request-types': null,
    'request-workflow': null,
    'approvals': null,
    'directory': null,
    'news': null,
    'newsletter': 'monthly_newsletter',
    'knowledge-base': null,
    'modality': 'modality_management',
    'documentation': null,
    'fax': 'fax_campaigns',
    'catalog': null,
    'permissions': null,
    'notifications': null,
    'settings': null,
    'admin': null,
    'faq': null,
  };

  // Map sections to required permissions
  const sectionPermissionMap: Record<string, string[] | null> = {
    'getting-started': null, // Everyone
    'request-types': null, // Everyone (filtered by request type permissions)
    'request-workflow': null, // Everyone
    'approvals': ['approve_hardware_requests', 'approve_user_account_requests', 'approve_marketing_requests', 'approve_newsletter_submissions'], // Any approval permission
    'directory': null, // Everyone
    'news': ['view_news', 'create_news', 'edit_news'], // Anyone who can view or manage news
    'newsletter': ['submit_newsletter', 'manage_newsletter_cycle'], // Newsletter participants
    'knowledge-base': null, // Everyone
    'modality': ['view_modality_details'], // Modality viewers
    'documentation': ['view_sharepoint_documents'], // SharePoint access
    'fax': ['view_fax_campaigns'], // Fax campaign viewers
    'catalog': null, // Everyone
    'permissions': ['manage_company_users', 'manage_role_permissions'], // User/role managers
    'notifications': null, // Everyone
    'settings': ['configure_company_settings', 'manage_company_features', 'manage_office365_integration'], // Settings managers
    'admin': null, // Checked separately by role
    'faq': null, // Everyone
  };

  // Check if user has permission for a section
  const hasAccessToSection = (sectionId: string): boolean => {
    // Check feature flag first
    const requiredFeature = sectionFeatureMap[sectionId];
    if (requiredFeature && !isFeatureEnabled(requiredFeature as any)) {
      return false;
    }

    // Check permissions
    const requiredPermissions = sectionPermissionMap[sectionId];
    if (!requiredPermissions) return true; // No permission required

    // Special case for admin section - only super admins
    if (sectionId === 'admin') {
      return isSuperAdmin;
    }

    // User needs at least one of the required permissions
    return hasAnyPermission(requiredPermissions);
  };

  const allIndexSections = [
    { id: 'getting-started', label: 'Getting Started', icon: CheckCircle },
    { id: 'request-types', label: 'Request Types', icon: ListChecks },
    { id: 'request-workflow', label: 'Request Workflow', icon: Clock },
    { id: 'approvals', label: 'Approvals & Management', icon: CheckCircle },
    { id: 'directory', label: 'Company Directory', icon: Users },
    { id: 'news', label: 'News Management', icon: Newspaper },
    { id: 'newsletter', label: 'Newsletter System', icon: Mail },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    { id: 'modality', label: 'Modality Management', icon: Network },
    { id: 'documentation', label: 'Documentation & SharePoint', icon: FileText },
    { id: 'fax', label: 'Fax Campaigns', icon: Phone },
    { id: 'catalog', label: 'Catalog Management', icon: Database },
    { id: 'permissions', label: 'Permissions & Roles', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings & Configuration', icon: Settings },
    { id: 'admin', label: 'Platform Admin Features', icon: Building2 },
    { id: 'faq', label: 'Frequently Asked Questions', icon: HelpCircle },
  ];

  // Filter sections based on enabled features and permissions
  const indexSections = useMemo(() => {
    return allIndexSections.filter(section => hasAccessToSection(section.id));
  }, [isFeatureEnabled, hasAnyPermission, isSuperAdmin]);

  // Helper to check if a request type should be shown
  const shouldShowRequestType = (featureKey: string | null, createPermission?: string) => {
    // Check feature flag
    if (featureKey && !isFeatureEnabled(featureKey as any)) return false;
    
    // Check create permission if specified
    if (createPermission && !hasPermission(createPermission)) return false;
    
    return true;
  };

  return (
    <PageContainer maxWidth="xl" className="flex gap-6">
        {/* Mobile toggle */}
        <Button
          variant="outline"
          size="icon"
          className="fixed top-20 right-4 z-50 lg:hidden"
          onClick={() => setShowIndex(!showIndex)}
        >
          {showIndex ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        {/* Main Content */}
        <div className="flex-1 space-y-8 max-w-4xl">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <BookOpen className="w-10 h-10 text-primary" />
                Complete Help Guide
              </h1>
              <Badge variant="outline" className="text-xs">v{APP_VERSION}</Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              Comprehensive documentation for all features in the Request Management System
            </p>
          </div>

          {/* Getting Started */}
          <section id="getting-started">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Welcome to the Request Management System! This platform helps organizations manage requests, 
                  track approvals, collaborate on projects, and streamline communication.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Home Dashboard</h4>
                    <p className="text-sm text-muted-foreground">
                      Customizable widgets, metrics, news feed, and quick actions to start your day.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">My Requests</h4>
                    <p className="text-sm text-muted-foreground">
                      View and track all your submitted requests in one place with real-time status updates.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Stay informed with email and in-app notifications for request updates and mentions.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Help & Support</h4>
                    <p className="text-sm text-muted-foreground">
                      Access this guide anytime, submit feedback, or contact support for assistance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Request Types */}
          <section id="request-types">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-primary" />
                  Request Types
                </CardTitle>
                <CardDescription>All available request categories in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {shouldShowRequestType('hardware_requests', 'create_hardware_request') && (
                    <AccordionItem value="hardware">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-primary" />
                          <span>Hardware Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Request computers, monitors, peripherals, and other IT equipment for your team.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Create custom hardware requests with specifications</li>
                          <li>Add business justification and expected delivery dates</li>
                          <li>Track approval progress and order status</li>
                          <li>Attach quotes, specifications, or supporting documents</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('user_accounts', 'create_user_account_request') && (
                    <AccordionItem value="user-accounts">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-primary" />
                          <span>User Account Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Set up new user accounts for employees joining your organization.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Provide employee details (name, position, department, location)</li>
                          <li>Select Office 365 licenses and application access</li>
                          <li>Link to related hardware requests</li>
                          <li>Set start dates and onboarding preferences</li>
                          <li>Request distribution lists and shared mailbox access</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('user_accounts', 'create_user_offboarding_request') && (
                    <AccordionItem value="offboarding">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-primary" />
                          <span>User Offboarding Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Manage the secure offboarding process for departing employees.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Disable user accounts and revoke system access</li>
                          <li>Forward emails to designated recipients</li>
                          <li>Backup and archive user data</li>
                          <li>Schedule equipment collection</li>
                          <li>Complete offboarding checklist items</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('marketing_requests', 'create_marketing_request') && (
                    <AccordionItem value="marketing">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-primary" />
                          <span>Marketing Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Request marketing campaigns, design services, website updates, and promotional materials.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Create fax and email blast campaigns</li>
                          <li>Request website updates and SEO services</li>
                          <li>Order print materials and promotional items</li>
                          <li>Get graphic design and creative support</li>
                          <li>Plan social media and advertising campaigns</li>
                          <li>Request content creation and copywriting</li>
                          <li>Brand guideline consultations</li>
                          <li>Set up recurring communications</li>
                          <li>Track campaign performance and engagement</li>
                          <li>View marketing calendar for coordination</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('print_ordering', 'create_toner_request') && (
                    <AccordionItem value="print-orders">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Printer className="w-4 h-4 text-primary" />
                          <span>Print Ordering & Toner Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Order printer toner, business cards, brochures, and other printed materials.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Request toner cartridges for specific printer models</li>
                          <li>Order business cards and stationery</li>
                          <li>Request marketing collateral printing</li>
                          <li>Track inventory and delivery status</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('department_requests', 'create_facility_services_request') && (
                    <AccordionItem value="facility-services">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span>Facility Services Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Request building maintenance, repairs, and facility improvements.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Report maintenance issues and repairs</li>
                          <li>Request office space modifications</li>
                          <li>Schedule cleaning or janitorial services</li>
                          <li>Request security or access changes</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('department_requests', 'create_office_services_request') && (
                    <AccordionItem value="office-services">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" />
                          <span>Office Services Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Request office supplies, furniture, and general administrative support.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Order office supplies and stationery</li>
                          <li>Request furniture and ergonomic equipment</li>
                          <li>Schedule meeting room setup</li>
                          <li>Request catering or event support</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('department_requests', 'create_accounts_payable_request') && (
                    <AccordionItem value="accounts-payable">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          <span>Accounts Payable Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Submit invoices, expense reports, and payment requests.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Submit vendor invoices for payment</li>
                          <li>Request expense reimbursements</li>
                          <li>Track payment status and approval</li>
                          <li>Attach receipts and supporting documents</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('department_requests', 'create_finance_request') && (
                    <AccordionItem value="finance">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          <span>Finance Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Request budget approvals, financial reports, or accounting support.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Request budget allocations and approvals</li>
                          <li>Financial reporting and analysis</li>
                          <li>Purchase order creation</li>
                          <li>Budget variance explanations</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('department_requests', 'create_technology_training_request') && (
                    <AccordionItem value="tech-training">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-primary" />
                          <span>Technology Training Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Request training sessions for software, systems, or technology tools.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Schedule software training sessions</li>
                          <li>Request one-on-one technology support</li>
                          <li>Group training for teams or departments</li>
                          <li>Access training materials and documentation</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('department_requests', 'create_it_service_desk_request') && (
                    <AccordionItem value="it-service-desk">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-primary" />
                          <span>IT Service Desk Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Get help with technical issues, software problems, or IT support needs.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Report technical issues and bugs</li>
                          <li>Request software installation or updates</li>
                          <li>Password resets and access issues</li>
                          <li>Network connectivity problems</li>
                          <li>Hardware troubleshooting</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {shouldShowRequestType('department_requests', 'create_hr_request') && (
                    <AccordionItem value="hr">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          <span>HR Requests</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Submit HR-related requests for policy questions, benefits, or employee services.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Request time off or leave</li>
                          <li>Update employee information</li>
                          <li>Benefits enrollment and changes</li>
                          <li>Policy clarifications</li>
                          <li>Training and development requests</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Request Workflow */}
          <section id="request-workflow">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Request Workflow
                </CardTitle>
                <CardDescription>Understanding the approval process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">1</Badge>
                    <div>
                      <h4 className="font-semibold">Draft</h4>
                      <p className="text-sm text-muted-foreground">
                        Create and save your request. Edit anytime before submitting.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">2</Badge>
                    <div>
                      <h4 className="font-semibold">Submitted</h4>
                      <p className="text-sm text-muted-foreground">
                        Request is pending review. Notifications sent to approvers.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">3</Badge>
                    <div>
                      <h4 className="font-semibold">Manager Approved</h4>
                      <p className="text-sm text-muted-foreground">
                        Manager has approved. Awaiting admin/department approval.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">4</Badge>
                    <div>
                      <h4 className="font-semibold">Admin Approved</h4>
                      <p className="text-sm text-muted-foreground">
                        Fully approved and ready for processing or fulfillment.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">5</Badge>
                    <div>
                      <h4 className="font-semibold">In Progress</h4>
                      <p className="text-sm text-muted-foreground">
                        Request is being actively worked on by the assigned team.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">6</Badge>
                    <div>
                      <h4 className="font-semibold">Completed</h4>
                      <p className="text-sm text-muted-foreground">
                        Request has been fulfilled and closed successfully.
                      </p>
                    </div>
                  </div>
                </div>

                <Alert className="mt-4">
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription>
                    Requests can be declined at any approval stage. You'll receive an email with the reason 
                    and can submit a revised request if needed.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </section>

          {/* Approvals & Management */}
          {hasAccessToSection('approvals') && (
          <section id="approvals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Approvals & Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="pending-approvals">
                    <AccordionTrigger>Pending Approvals Dashboard</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Managers and admins can review and approve pending requests from their team.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>View all requests awaiting your approval</li>
                        <li>Filter by request type, department, or priority</li>
                        <li>Bulk approve multiple requests at once</li>
                        <li>Add comments and feedback during approval</li>
                        <li>Assign requests to specific team members</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="request-assignment">
                    <AccordionTrigger>Request Assignment</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Assign requests to specific admins or managers for handling.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Assign admin and manager roles to requests</li>
                        <li>Automatic notification when assigned</li>
                        <li>Track who's working on which requests</li>
                        <li>Reassign if needed for better workload distribution</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="comments-activity">
                    <AccordionTrigger>Comments & Activity Feed</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Collaborate on requests through comments and activity tracking.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Add comments to requests for clarification</li>
                        <li>@mention users to notify them</li>
                        <li>View complete activity timeline</li>
                        <li>Track status changes and updates</li>
                        <li>Email notifications for comments</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>
          )}

          {/* Company Directory */}
          <section id="directory">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Company Directory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="directory-search">
                    <AccordionTrigger>Finding Colleagues</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Search and browse your company's employee directory.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Search by name, email, department, or position</li>
                        <li>Filter by department or location</li>
                        <li>View contact information and profiles</li>
                        <li>Export directory to CSV</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="profile-management">
                    <AccordionTrigger>Managing Your Profile</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Update your profile information visible to colleagues.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Upload profile photo</li>
                        <li>Update contact information (phone, location)</li>
                        <li>Add bio and job description</li>
                        <li>Control visibility of personal information</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* News Management */}
          {hasAccessToSection('news') && (
          <section id="news">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-primary" />
                  News Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="news-articles">
                    <AccordionTrigger>Creating News Articles</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Publish company news, announcements, and updates (Manager/Admin only).
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Create articles with rich text formatting</li>
                        <li>Add images, links, and media</li>
                        <li>Save drafts before publishing</li>
                        <li>Schedule future publication dates</li>
                        <li>Target specific departments or locations</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="news-permissions">
                    <AccordionTrigger>News Permissions</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Control who can create and manage news content.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Grant news management permissions to users</li>
                        <li>Set article visibility by department</li>
                        <li>Manage published vs draft content</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>
          )}

          {/* Newsletter */}
          {hasAccessToSection('newsletter') && (
            <section id="newsletter">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Monthly Newsletter System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="newsletter-cycle">
                      <AccordionTrigger>Newsletter Cycles (Editors)</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Create and manage monthly newsletter cycles for collaborative content creation.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Create new newsletter cycles with deadlines</li>
                          <li>Assign departments and contributors</li>
                          <li>Monitor submission progress</li>
                          <li>Send reminder emails to contributors</li>
                          <li>Review and edit submissions</li>
                          <li>Export newsletter in multiple formats (PDF, Word, Excel)</li>
                          <li>Lock cycle when finalized</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="newsletter-submit">
                      <AccordionTrigger>Submitting Content (Contributors)</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Contribute department content to the monthly newsletter.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Check assigned newsletter cycles</li>
                          <li>Fill out department-specific form</li>
                          <li>Save drafts and edit before deadline</li>
                          <li>Submit final content for review</li>
                          <li>Receive automated deadline reminders</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="newsletter-templates">
                      <AccordionTrigger>Newsletter Templates</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Create reusable templates for consistent newsletter formats.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Design custom newsletter templates</li>
                          <li>Define department sections</li>
                          <li>Set standard fields and formatting</li>
                          <li>Reuse templates across cycles</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Knowledge Base */}
          <section id="knowledge-base">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Knowledge Base
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="kb-structure">
                    <AccordionTrigger>Categories & Pages</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Organize company documentation in a searchable knowledge base.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Create categories and subcategories</li>
                        <li>Write and edit knowledge base pages</li>
                        <li>Rich text formatting with images and links</li>
                        <li>Search across all documentation</li>
                        <li>Track page views and usage</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="kb-versioning">
                    <AccordionTrigger>Version History</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Track changes and restore previous versions of pages.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Automatic version history for all edits</li>
                        <li>View who made changes and when</li>
                        <li>Compare versions side-by-side</li>
                        <li>Restore previous versions if needed</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="kb-sharing">
                    <AccordionTrigger>Sharing & Permissions</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Control access and share knowledge base content.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Generate shareable links to pages</li>
                        <li>Set page visibility (company-wide or specific roles)</li>
                        <li>Grant edit permissions to users</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Modality Management */}
          {hasAccessToSection('modality') && (
            <section id="modality">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-primary" />
                    Modality Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="modality-view">
                      <AccordionTrigger>Viewing Configurations</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          View DICOM modality configurations for clinic locations.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Browse clinic network configurations</li>
                          <li>View DICOM server settings</li>
                          <li>See modality details (CT, MRI, X-Ray, etc.)</li>
                          <li>Check network parameters</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="modality-share">
                      <AccordionTrigger>Shareable Links</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Generate secure links to share configurations externally.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Create shareable links for specific clinics</li>
                          <li>Set expiration dates for links</li>
                          <li>Track link access and views</li>
                          <li>Revoke links anytime</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Documentation & SharePoint */}
          {hasAccessToSection('documentation') && (
          <section id="documentation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documentation & SharePoint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="sharepoint-integration">
                    <AccordionTrigger>SharePoint Integration</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Access SharePoint documents directly from the platform.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Connect your Office 365 SharePoint account</li>
                        <li>Browse SharePoint sites and document libraries</li>
                        <li>View and download files</li>
                        <li>Search across SharePoint content</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="office365-links">
                    <AccordionTrigger>Office 365 Quick Links</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Quick access to commonly used Office 365 applications.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Direct links to Outlook, Teams, SharePoint</li>
                        <li>Access OneDrive and Office apps</li>
                        <li>Single sign-on with Office 365</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>
          )}

          {/* Fax Campaigns */}
          {hasAccessToSection('fax') && (
            <section id="fax">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    Fax Campaigns (Notifyre)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="fax-campaigns">
                      <AccordionTrigger>Managing Fax Campaigns</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p className="text-muted-foreground">
                          Send and track fax campaigns through Notifyre integration.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>View fax campaign history and logs</li>
                          <li>Track delivery status and confirmations</li>
                          <li>Download sent fax documents</li>
                          <li>Send test faxes</li>
                          <li>Monitor campaign performance</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Permissions */}
          {hasAccessToSection('permissions') && (
          <section id="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Permissions & Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="user-roles">
                    <AccordionTrigger>User Roles</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Different roles provide different levels of access.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li><strong>Requester:</strong> Submit and track own requests</li>
                        <li><strong>Manager:</strong> Approve requests, view team requests</li>
                        <li><strong>Tenant Admin:</strong> Full company management and configuration</li>
                        <li><strong>Super Admin:</strong> Platform-wide administration (Crowd IT only)</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="role-permissions">
                    <AccordionTrigger>Managing Permissions (Admin)</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Configure role-based permissions and feature access.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Assign roles to users</li>
                        <li>Customize permissions for each role</li>
                        <li>Control feature visibility</li>
                        <li>Set menu item visibility by role</li>
                        <li>User-level permission overrides</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="department-assignments">
                    <AccordionTrigger>Department Assignments</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Route requests to appropriate department teams.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Assign users to department teams</li>
                        <li>Set approval permissions per department</li>
                        <li>Configure notification recipients</li>
                        <li>Automatic request routing</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>
          )}

          {/* Notifications */}
          <section id="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="notification-types">
                    <AccordionTrigger>Types of Notifications</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Stay informed about important events and updates.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Request status changes (submitted, approved, completed)</li>
                        <li>New comments and @mentions</li>
                        <li>Request assignments</li>
                        <li>Approval required notifications</li>
                        <li>New news articles</li>
                        <li>Newsletter deadlines</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="notification-settings">
                    <AccordionTrigger>Notification Settings</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Customize your notification preferences.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>In-app notification center</li>
                        <li>Email notifications for key events</li>
                        <li>Configure notification frequency</li>
                        <li>Mute specific notification types</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="email-logs">
                    <AccordionTrigger>Email Tracking</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Track all system-generated emails.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>View email history for each request</li>
                        <li>See who received notifications</li>
                        <li>Check email delivery status</li>
                        <li>Resend notifications if needed (Admin)</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Settings */}
          {hasAccessToSection('settings') && (
          <section id="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Settings & Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="company-settings">
                    <AccordionTrigger>Company Settings (Admin)</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Configure company-wide settings and branding.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Update company name and logo</li>
                        <li>Configure color scheme and branding</li>
                        <li>Set company domains for user registration</li>
                        <li>Manage company locations</li>
                        <li>Configure request number prefixes</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="user-management">
                    <AccordionTrigger>User Management (Admin)</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Manage users, roles, and invitations.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Invite new users via email</li>
                        <li>Assign roles and permissions</li>
                        <li>Sync with Office 365 users</li>
                        <li>Deactivate user accounts</li>
                        <li>View user activity and login history</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="integrations">
                    <AccordionTrigger>Integrations</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Connect external services and platforms.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Office 365 / Microsoft Graph integration</li>
                        <li>SharePoint document access</li>
                        <li>Notifyre fax service integration</li>
                        <li>Halo PSA ticketing integration</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="home-customization">
                    <AccordionTrigger>Home Page Customization (Manager/Admin)</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Customize the home page layout and widgets.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Add, remove, and arrange widgets</li>
                        <li>Customize hero banner and messaging</li>
                        <li>Configure quick action buttons</li>
                        <li>Set featured content and news</li>
                        <li>Drag and drop layout editor</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="menu-configuration">
                    <AccordionTrigger>Menu Configuration (Admin)</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Customize navigation menu and sidebar.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Show/hide menu items by role</li>
                        <li>Reorder menu items</li>
                        <li>Add custom menu links</li>
                        <li>Configure menu labels and icons</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>
          )}

          {/* Platform Admin */}
          {hasAccessToSection('admin') && (
          <section id="admin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Platform Admin Features
                </CardTitle>
                <CardDescription>Super Admin / Crowd IT only</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="company-management">
                    <AccordionTrigger>Company Management</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Manage multiple tenant companies on the platform.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Create and configure new companies</li>
                        <li>View all companies and their settings</li>
                        <li>Manage company features and limits</li>
                        <li>Configure company domains and subdomains</li>
                        <li>Access any company for support</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="audit-logs">
                    <AccordionTrigger>Audit Logs</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Track all system activities and changes.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>View all user actions and changes</li>
                        <li>Filter by user, action type, or date</li>
                        <li>Track data modifications</li>
                        <li>Export audit logs for compliance</li>
                        <li>Monitor security events</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="system-status">
                    <AccordionTrigger>System Status Management</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Manage system status indicators and banners.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Set critical system status indicators</li>
                        <li>Display system-wide banner messages</li>
                        <li>Schedule maintenance notifications</li>
                        <li>Control banner visibility</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="form-templates">
                    <AccordionTrigger>Form Templates (Dynamic Forms)</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Create custom department request forms.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Visual form builder with drag-and-drop</li>
                        <li>Add various field types (text, select, date, file upload)</li>
                        <li>Set required fields and validation rules</li>
                        <li>Preview forms before publishing</li>
                        <li>Seed default templates for common departments</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="role-impersonation">
                    <AccordionTrigger>Role Impersonation</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground">
                        Test features by impersonating different user roles.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Switch between roles to test permissions</li>
                        <li>View the system as different user types</li>
                        <li>Troubleshoot permission issues</li>
                        <li>Verify role configurations</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>
          )}

          {/* FAQ */}
          <section id="faq">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="faq-1">
                    <AccordionTrigger>How do I submit a new request?</AccordionTrigger>
                    <AccordionContent>
                      Navigate to the relevant request type in the sidebar (e.g., "New Hardware Request"). 
                      Fill in all required fields, add any necessary attachments or descriptions, and click Submit. 
                      You can also save as draft to complete later.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-2">
                    <AccordionTrigger>How long does approval typically take?</AccordionTrigger>
                    <AccordionContent>
                      Approval times vary by organization and request type. Typically, manager approval takes 1-2 business days, 
                      followed by admin approval. You'll receive email notifications at each approval stage. Check your 
                      request status in "My Requests" for real-time updates.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-3">
                    <AccordionTrigger>Can I edit a request after submitting it?</AccordionTrigger>
                    <AccordionContent>
                      You can edit requests in "Draft" or "Submitted" status. Once a request reaches "Manager Approved" 
                      or later stages, you'll need to contact an admin to make changes or submit a new request.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-4">
                    <AccordionTrigger>What happens if my request is declined?</AccordionTrigger>
                    <AccordionContent>
                      If declined, you'll see the reason in the request details and receive an email notification. 
                      Review the feedback, and if appropriate, submit a new request addressing the concerns raised.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-5">
                    <AccordionTrigger>How do I track email notifications for my requests?</AccordionTrigger>
                    <AccordionContent>
                      Go to "My Requests", click on any request, and look for the "Email Notifications" or "Email Logs" 
                      section. This shows all emails sent for that request, including recipients, timestamps, and delivery status.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-8">
                    <AccordionTrigger>How do I add a comment or mention someone?</AccordionTrigger>
                    <AccordionContent>
                      Open any request and scroll to the Comments section. Type your comment and use @username to mention 
                      a specific user. They'll receive a notification about your mention.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-9">
                    <AccordionTrigger>Can I export the Company Directory?</AccordionTrigger>
                    <AccordionContent>
                      Yes! In the Company Directory, click the "Export to CSV" button to download a spreadsheet of all 
                      employees with their contact information and details.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-10">
                    <AccordionTrigger>How do I contribute to the monthly newsletter?</AccordionTrigger>
                    <AccordionContent>
                      When assigned to a newsletter cycle, you'll receive an email notification. Click the link or navigate 
                      to Newsletter → Submit. Fill out your department's form, save drafts as needed, and submit before 
                      the deadline. You'll receive automated reminders as the deadline approaches.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-11">
                    <AccordionTrigger>Who can create news articles?</AccordionTrigger>
                    <AccordionContent>
                      By default, Managers and Admins can create news articles. Admins can grant news management permissions 
                      to specific users in the Permissions settings.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-12">
                    <AccordionTrigger>How do I update my profile photo?</AccordionTrigger>
                    <AccordionContent>
                      Go to Company Directory, find your profile, and click the edit icon. Upload a new profile photo, 
                      update your bio or contact information, and save changes.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-13">
                    <AccordionTrigger>What integrations are available?</AccordionTrigger>
                    <AccordionContent>
                      The system integrates with Office 365 (user sync, SharePoint documents), Notifyre (fax campaigns), 
                      and Halo PSA (ticketing). Admins can configure these integrations in Settings.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-14">
                    <AccordionTrigger>How do I get admin access?</AccordionTrigger>
                    <AccordionContent>
                      Contact your organization's Tenant Admin or your IT department. They can assign you the appropriate 
                      role (Manager, Tenant Admin) based on your responsibilities.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Contact Support */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <HelpCircle className="w-8 h-8 text-primary shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Still Need Help?</h3>
                  <p className="text-muted-foreground mb-4">
                    If you can't find what you're looking for in this guide, we're here to help!
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Use the <strong>Beta Feedback</strong> button (top right) to send questions or suggestions</li>
                    <li>• Check the <strong>Knowledge Base</strong> for detailed documentation</li>
                    <li>• Contact your <strong>Tenant Admin</strong> for company-specific questions</li>
                    <li>• Admins can view the <strong>Audit Log</strong> to track system activities</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Index Navigation */}
        <aside className={cn(
          "lg:sticky lg:top-6 lg:block h-fit transition-all",
          showIndex ? "block fixed top-16 right-0 z-40 bg-background border-l p-4 w-64" : "hidden lg:block lg:w-64"
        )}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Menu className="w-4 h-4" />
                Quick Navigation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <nav className="space-y-1 p-4">
                  {indexSections.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4 text-primary" />
                      {label}
                    </button>
                  ))}
                </nav>
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>
    </PageContainer>
  );
};

export default Help;
