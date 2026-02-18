// VRG Hub Application - Rebuild trigger for env variables
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RBACProvider } from "@/contexts/RBACContext";
import { InlineEditProvider } from "@/contexts/InlineEditContext";
import { ProtectedLayoutRoute } from "@/components/ProtectedLayoutRoute";
import { RouteLoading } from "@/components/RouteLoading";
import { ThemeApplier } from "./components/ThemeApplier";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { useCacheVersion } from "@/hooks/useCacheVersion";

// Eager imports for high-traffic pages
import Auth from "./pages/Auth";
import SystemLogin from "./pages/SystemLogin";
import CreateSystemAdmin from "./pages/CreateSystemAdmin";
import Home from "./pages/Home";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import EditRequest from "./pages/EditRequest";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Lazy imports for low-traffic pages
const NewRequest = lazy(() => import("./pages/NewRequest"));
const NewRequestCategory = lazy(() => import("./pages/NewRequestCategory"));
const NewDynamicRequest = lazy(() => import("./pages/NewDynamicRequest"));
const NewTicket = lazy(() => import("./pages/NewTicket"));
const MonthlyNewsletter = lazy(() => import("./pages/MonthlyNewsletter"));
const Approvals = lazy(() => import("./pages/Approvals"));
const Admin = lazy(() => import("./pages/Admin"));
const ModalityManagement = lazy(() => import("./pages/ModalityManagement"));
const SharedClinic = lazy(() => import("./pages/SharedClinic"));
const ConfirmOrder = lazy(() => import("./pages/ConfirmOrder"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Help = lazy(() => import("./pages/Help"));
const UserRoles = lazy(() => import("./pages/UserRoles"));
const ContactSupport = lazy(() => import("./pages/ContactSupport"));
const FileManager = lazy(() => import("./pages/FileManager"));
const PrintOrderingForms = lazy(() => import("./pages/PrintOrderingForms"));
const NewsManagement = lazy(() => import("./pages/NewsManagement"));
const NewsViewAll = lazy(() => import("./pages/NewsViewAll"));
const ArticleEditor = lazy(() => import("./components/news/ArticleEditor"));
const ArticleView = lazy(() => import("./pages/ArticleView"));
const HelpTicket = lazy(() => import("./pages/HelpTicket"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CompanyAdmin = lazy(() => import("./pages/CompanyAdmin"));
const CompanyDirectory = lazy(() => import("./pages/CompanyDirectory"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const Email = lazy(() => import("./pages/Email"));
const MarketingCampaigns = lazy(() => import("./pages/MarketingCampaigns"));
const MarketingCalendar = lazy(() => import("./pages/MarketingCalendar"));
const PermissionManager = lazy(() => import("./pages/PermissionManager"));
// NewsletterSubmit lazy import removed - not currently used in routes
const AdvancedNotifications = lazy(() => import("./pages/AdvancedNotifications"));
const ContentEditor = lazy(() => import("./pages/ContentEditor"));
const FormTemplates = lazy(() => import("./pages/FormTemplates"));
const SeedFormTemplates = lazy(() => import("./pages/SeedFormTemplates"));
const AssignCategories = lazy(() => import("./pages/AssignCategories"));
const UploadLogoToStorage = lazy(() => import("./pages/UploadLogoToStorage"));
const MloContacts = lazy(() => import("./pages/MloContacts"));
const MloCommunications = lazy(() => import("./pages/MloCommunications"));
const MloTasks = lazy(() => import("./pages/MloTasks"));
const MloPipeline = lazy(() => import("./pages/MloPipeline"));
const Install = lazy(() => import("./pages/Install"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Reminders = lazy(() => import("./pages/Reminders"));
const NewReminder = lazy(() => import("./pages/NewReminder"));
const ReminderDetail = lazy(() => import("./pages/ReminderDetail"));
const ReminderEdit = lazy(() => import("./pages/ReminderEdit"));
const SiteMaps = lazy(() => import("./pages/SiteMaps"));
const SharedModality = lazy(() => import("./pages/SharedModality"));
const SharedMloPerformance = lazy(() => import("./pages/SharedMloPerformance"));
const MissionStatement = lazy(() => import("./pages/MissionStatement"));
const ExternalProviders = lazy(() => import("./pages/ExternalProviders"));
const EmailTest = lazy(() => import("./pages/EmailTest"));
const EmailTestingDashboard = lazy(() => import("./pages/EmailTestingDashboard"));
const SetupVerification = lazy(() => import("./pages/SetupVerification"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Documents = lazy(() => import("./pages/Documents"));
const HRAssistance = lazy(() => import("./pages/HRAssistance"));
const IncidentForm = lazy(() => import("./pages/IncidentForm"));
const PageEditor = lazy(() => import("./pages/PageEditor"));
const PageViewer = lazy(() => import("./pages/PageViewer"));
const PageManager = lazy(() => import("./pages/PageManager"));
const DailyChecklist = lazy(() => import("./pages/DailyChecklist"));
const ChecklistTemplates = lazy(() => import("./pages/admin/ChecklistTemplates"));
const ChecklistTemplateEditor = lazy(() => import("./pages/admin/ChecklistTemplateEditor"));
const ChecklistReports = lazy(() => import("./pages/admin/ChecklistReports"));
const AnalyticsAI = lazy(() => import("./pages/AnalyticsAI"));
const HandlerGroupsAdmin = lazy(() => import("./pages/admin/HandlerGroupsAdmin"));
const ModalityDepartmentPage = lazy(() => import("./pages/ModalityDepartmentPage"));
const ReferrerLookup = lazy(() => import("./pages/ReferrerLookup"));
const ClinicSetupChecklists = lazy(() => import("./pages/ClinicSetupChecklists"));
const ClinicSetupDetail = lazy(() => import("./pages/ClinicSetupDetail"));
const RosterConverter = lazy(() => import("./pages/RosterConverter"));
const PublicRosterConverter = lazy(() => import("./pages/PublicRosterConverter"));
const EmbeddedOrderFormPage = lazy(() => import("./pages/EmbeddedOrderFormPage"));
const Rosters = lazy(() => import("./pages/Rosters"));
const RadiologySearch = lazy(() => import("./pages/RadiologySearch"));
const MloDashboard = lazy(() => import("./pages/MloDashboard"));
const MloVisits = lazy(() => import("./pages/MloVisits"));
const MloTargetsManager = lazy(() => import("./pages/MloTargetsManager"));
const MloPerformanceDashboard = lazy(() => import("./pages/MloPerformanceDashboard"));
const MloPerformanceDetail = lazy(() => import("./pages/MloPerformanceDetail"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const BusinessListings = lazy(() => import("./pages/BusinessListings"));
const VideoGallery = lazy(() => import("./pages/VideoGallery"));
const DicomConverter = lazy(() => import("./pages/DicomConverter"));
const D2dConverter = lazy(() => import("./pages/D2dConverter"));
const D2dConverterApi = lazy(() => import("./pages/D2dConverterApi"));
const DicomUploadPage = lazy(() => import("./pages/DicomUploadPage"));
const CpdTracker = lazy(() => import("./pages/CpdTracker"));
const CpdBulkAdd = lazy(() => import("./pages/CpdBulkAdd"));
const CpdAllRecords = lazy(() => import("./pages/CpdAllRecords"));
const QRCodeGeneratorPage = lazy(() => import("./pages/QRCodeGenerator"));
const QRRedirect = lazy(() => import("./pages/QRRedirect"));
const protectedLayoutRoutes: Array<{
  path: string;
  element: JSX.Element;
  requiredRole?: string[];
}> = [
  { path: "/home", element: <Home /> },
  { path: "/notifications", element: <Notifications /> },
  { path: "/requests", element: <Requests /> },
  { path: "/request/:requestNumber", element: <RequestDetail /> },
  { path: "/requests/:identifier", element: <RequestDetail /> },
  { path: "/requests/:identifier/edit", element: <EditRequest /> },
  { path: "/requests/hardware/:id", element: <Requests /> },
  { path: "/requests/marketing/:id", element: <Requests /> },
  { path: "/requests/user-account/:id", element: <Requests /> },
  { path: "/requests/new", element: <NewRequest /> },
  { path: "/requests/new/:slug", element: <NewRequestCategory /> },
  { path: "/requests/new/:slug/:categorySlug", element: <NewDynamicRequest /> },
  { path: "/requests/tickets/new", element: <NewTicket /> },
  { path: "/documents", element: <Documents /> },
  { path: "/print-orders", element: <PrintOrderingForms /> },
  { path: "/order/:formCode", element: <EmbeddedOrderFormPage /> },
  { path: "/company-documents", element: <Documentation /> },
  { path: "/hr-assistance", element: <HRAssistance /> },
  { path: "/incident-form", element: <IncidentForm /> },
  { path: "/pages/edit", element: <PageEditor />, requiredRole: ["super_admin"] },
  { path: "/pages/manage", element: <PageManager />, requiredRole: ["super_admin"] },
  { path: "/pages/:slug", element: <PageViewer /> },
  { path: "/news/view-all", element: <NewsViewAll /> },
  { path: "/news", element: <NewsManagement /> },
  { path: "/news/new", element: <ArticleEditor /> },
  { path: "/news/edit/:articleId", element: <ArticleEditor /> },
  { path: "/news/:slug", element: <ArticleView /> },
  { path: "/newsletter", element: <MonthlyNewsletter /> },
  { path: "/approvals", element: <Approvals /> },
  { path: "/settings", element: <Settings /> },
  { path: "/modality-management", element: <ModalityManagement /> },
  { path: "/help", element: <Help /> },
  { path: "/requests/help", element: <HelpTicket /> },
  { path: "/directory", element: <CompanyDirectory /> },
  { path: "/phone-directory", element: <CompanyDirectory /> },
  { path: "/company-directory", element: <CompanyDirectory /> },
  { path: "/external-providers", element: <ExternalProviders /> },
  { path: "/knowledge-base", element: <KnowledgeBase /> },
  { path: "/email", element: <Email /> },
  { path: "/marketing-campaigns", element: <MarketingCampaigns /> },
  { path: "/marketing-calendar", element: <MarketingCalendar /> },
  { path: "/business-listings", element: <BusinessListings /> },
  { path: "/fax-campaigns", element: <Navigate to="/marketing-campaigns" replace /> },
  { path: "/mailchimp-campaigns", element: <Navigate to="/marketing-campaigns" replace /> },
  { path: "/requests/support", element: <ContactSupport /> },
  { path: "/contact-support", element: <Navigate to="/requests/support" replace /> },
  { path: "/help-ticket", element: <Navigate to="/requests/help" replace /> },
  { path: "/tickets/new", element: <Navigate to="/requests/tickets/new" replace /> },
  { path: "/admin", element: <Admin />, requiredRole: ["super_admin"] },
  { path: "/admin/company", element: <CompanyAdmin />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/admin/files", element: <FileManager />, requiredRole: ["super_admin"] },
  { path: "/audit-log", element: <AuditLog />, requiredRole: ["super_admin"] },
  { path: "/users", element: <Admin />, requiredRole: ["tenant_admin", "super_admin"] },
  { path: "/permissions", element: <PermissionManager />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/user-roles", element: <UserRoles />, requiredRole: ["tenant_admin", "super_admin"] },
  { path: "/notifications/advanced", element: <AdvancedNotifications />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/content-editor", element: <ContentEditor />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/form-templates", element: <FormTemplates />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/form-templates/seed", element: <SeedFormTemplates />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/form-templates/assign", element: <AssignCategories />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/integrations", element: <Integrations />, requiredRole: ["super_admin"] },
  { path: "/reminders", element: <Reminders /> },
  { path: "/reminders/new", element: <NewReminder /> },
  { path: "/reminders/edit/:id", element: <ReminderEdit /> },
  { path: "/reminders/:id", element: <ReminderDetail /> },
  { path: "/site-maps", element: <SiteMaps /> },
  { path: "/install", element: <Install /> },
  { path: "/mission-statement", element: <MissionStatement /> },
  { path: "/email-test", element: <EmailTest />, requiredRole: ["super_admin", "tenant_admin", "manager"] },
  { path: "/email-testing", element: <EmailTestingDashboard />, requiredRole: ["super_admin", "tenant_admin", "manager"] },
  { path: "/setup-verification", element: <SetupVerification />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/checklists/daily", element: <DailyChecklist /> },
  { path: "/admin/checklist-templates", element: <ChecklistTemplates />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/admin/checklist-templates/:id", element: <ChecklistTemplateEditor />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/admin/checklist-reports", element: <ChecklistReports />, requiredRole: ["super_admin", "tenant_admin", "manager"] },
  { path: "/analytics-ai", element: <AnalyticsAI />, requiredRole: ["super_admin"] },
  { path: "/admin/handler-groups", element: <HandlerGroupsAdmin />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/modality/:key", element: <ModalityDepartmentPage /> },
  { path: "/department/:key", element: <ModalityDepartmentPage /> },
  { path: "/video-gallery", element: <VideoGallery /> },
  { path: "/referrer-lookup", element: <ReferrerLookup /> },
  { path: "/dicom-converter", element: <DicomConverter /> },
  { path: "/d2d", element: <D2dConverterApi /> },
  { path: "/d2d-converter", element: <D2dConverterApi /> },
  { path: "/documents-to-dicom", element: <D2dConverterApi /> },
  { path: "/d2d-iframe", element: <D2dConverter /> },
  { path: "/dicom-upload", element: <DicomUploadPage /> },
  { path: "/clinic-setup", element: <ClinicSetupChecklists />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/clinic-setup/:id", element: <ClinicSetupDetail />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/roster-converter", element: <RosterConverter /> },
  { path: "/rosters", element: <Rosters /> },
  { path: "/radiology-search", element: <RadiologySearch />, requiredRole: ["super_admin"] },
  { path: "/mlo-dashboard", element: <MloDashboard />, requiredRole: ["super_admin", "tenant_admin", "marketing", "marketing_manager"] },
  { path: "/mlo/visits", element: <MloVisits />, requiredRole: ["super_admin", "tenant_admin", "marketing", "marketing_manager"] },
  { path: "/mlo-contacts", element: <MloContacts />, requiredRole: ["super_admin", "tenant_admin", "marketing", "marketing_manager"] },
  { path: "/mlo-communications", element: <MloCommunications />, requiredRole: ["super_admin", "tenant_admin", "marketing", "marketing_manager"] },
  { path: "/mlo-tasks", element: <MloTasks />, requiredRole: ["super_admin", "tenant_admin", "marketing", "marketing_manager"] },
  { path: "/mlo-pipeline", element: <MloPipeline />, requiredRole: ["super_admin", "tenant_admin", "marketing", "marketing_manager"] },
  { path: "/mlo-targets", element: <MloTargetsManager />, requiredRole: ["super_admin", "marketing_manager"] },
  { path: "/mlo-performance", element: <MloPerformanceDashboard />, requiredRole: ["super_admin", "tenant_admin", "marketing", "marketing_manager"] },
  { path: "/mlo-performance/:mloId", element: <MloPerformanceDetail />, requiredRole: ["super_admin", "tenant_admin", "marketing", "marketing_manager"] },
  { path: "/executive-dashboard", element: <ExecutiveDashboard />, requiredRole: ["super_admin", "executive"] },
  { path: "/cpd-tracker", element: <CpdTracker /> },
  { path: "/cpd-bulk-add", element: <CpdBulkAdd />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/cpd-all-records", element: <CpdAllRecords />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/qr-code-generator", element: <QRCodeGeneratorPage /> },
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - reduce unnecessary refetches
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      retry: 1, // Only retry once to reduce failed request overhead
      refetchOnWindowFocus: false, // Disable auto-refetch on window focus for performance
      refetchOnMount: 'always', // Only refetch if stale
      refetchOnReconnect: 'always', // Refetch when network reconnects
    },
  },
});

// Component to initialize cache version checking
function CacheVersionManager({ children }: { children: React.ReactNode }) {
  useCacheVersion();
  return <>{children}</>;
}

function App() {
  // Check if we're on the QR subdomain - if so, render only QR redirect functionality
  const hostname = window.location.hostname;
  const isQRSubdomain = hostname === 'qr.visionradiology.com.au' || hostname.startsWith('qr.');
  
  if (isQRSubdomain) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/:shortCode" element={<QRRedirect />} />
                <Route path="*" element={
                  <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                    <p className="text-gray-500">Invalid QR code link</p>
                  </div>
                } />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CacheVersionManager>
          <AuthProvider>
            <RBACProvider>
              <InlineEditProvider>
                <ThemeApplier />
                <TooltipProvider>
                  <Toaster />
                  <KeyboardShortcutsDialog />
                  <BrowserRouter>
                  <Suspense fallback={<RouteLoading />}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/home" replace />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/system-login" element={<SystemLogin />} />
                      <Route path="/create-system-admin" element={<CreateSystemAdmin />} />
                      {protectedLayoutRoutes.map(({ path, element, requiredRole }) => (
                        <Route
                          key={path}
                          path={path}
                          element={
                            <ProtectedLayoutRoute requiredRole={requiredRole}>
                              {element}
                            </ProtectedLayoutRoute>
                          }
                        />
                      ))}
                      <Route path="/shared/:token" element={<SharedClinic />} />
                      <Route path="/shared-clinic/:token" element={<SharedModality />} />
                      <Route path="/shared-mlo-performance/:token" element={<SharedMloPerformance />} />
                      <Route path="/confirm-order/:token" element={<ConfirmOrder />} />
                      <Route path="/tools/roster-converter" element={<PublicRosterConverter />} />
                      <Route path="/upload-logo" element={<UploadLogoToStorage />} />
                      <Route path="/qr/:shortCode" element={<QRRedirect />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
                </TooltipProvider>
              </InlineEditProvider>
            </RBACProvider>
          </AuthProvider>
        </CacheVersionManager>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;