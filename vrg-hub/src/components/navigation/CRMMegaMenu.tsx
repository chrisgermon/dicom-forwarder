import { MegaMenu } from "./MegaMenu";
import {
  TrendingUp,
  BarChart3,
  Contact,
  MessageSquare,
  ListTodo,
  Target,
  Mail,
  Calendar,
  Globe2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface CRMMegaMenuProps {
  onClose?: () => void;
}

export function CRMMegaMenu({ onClose }: CRMMegaMenuProps) {
  const { userRole } = useAuth();
  const { hasPermission, isFeatureEnabled } = usePermissions();

  const isMLO = userRole === 'marketing' || userRole === 'marketing_manager';
  const isManager = userRole === 'manager' || userRole === 'marketing_manager';
  const isAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';
  const canViewFaxCampaigns = hasPermission('view_fax_campaigns') && isFeatureEnabled('fax_campaigns');
  const canAccessCRM = isMLO || isManager || isAdmin;

  if (!canAccessCRM) {
    return null;
  }

  const sections = [];

  // Analytics section
  const analyticsItems = [
    { label: "Dashboard", href: "/mlo-dashboard", icon: TrendingUp },
  ];

  if (isAdmin) {
    analyticsItems.push({ label: "Performance", href: "/mlo-performance", icon: BarChart3 });
  }

  sections.push({
    title: "ANALYTICS",
    items: analyticsItems,
  });

  // Contacts & Communications section
  sections.push({
    title: "CONTACTS",
    items: [
      { label: "Contacts", href: "/mlo-contacts", icon: Contact },
      { label: "Communications", href: "/mlo-communications", icon: MessageSquare },
      { label: "Tasks", href: "/mlo-tasks", icon: ListTodo },
      { label: "Pipeline", href: "/mlo-pipeline", icon: TrendingUp },
    ],
  });

  // Sales & Marketing section
  const salesItems = [];

  if (isManager || isAdmin) {
    salesItems.push({ label: "Targets & Worksites", href: "/mlo-targets", icon: Target });
  }

  if (canViewFaxCampaigns || isAdmin) {
    salesItems.push({ label: "Marketing Campaigns", href: "/marketing-campaigns", icon: Mail });
    salesItems.push({ label: "Marketing Calendar", href: "/marketing-calendar", icon: Calendar });
  }

  if (salesItems.length > 0) {
    sections.push({
      title: "SALES & MARKETING",
      items: salesItems,
    });
  }

  // Marketing Tools section
  if (isManager || isAdmin) {
    sections.push({
      title: "MARKETING TOOLS",
      items: [
        { label: "Business Listings", href: "/business-listings", icon: Globe2 },
      ],
    });
  }

  return (
    <MegaMenu
      sections={sections}
      width="w-[650px]"
      onClose={onClose}
    />
  );
}
