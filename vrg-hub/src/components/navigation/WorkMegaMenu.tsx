import { MegaMenu } from "./MegaMenu";
import {
  Plus,
  Clock,
  CheckSquare,
  FileText,
  ListTodo,
  Bell,
  Users,
  Printer,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface WorkMegaMenuProps {
  onClose?: () => void;
}

export function WorkMegaMenu({ onClose }: WorkMegaMenuProps) {
  const { userRole } = useAuth();
  const { hasPermission, isFeatureEnabled } = usePermissions();

  const isAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';
  const isManager = userRole === 'manager' || userRole === 'marketing_manager' || isAdmin;
  const canManageHandlerGroups = userRole === 'super_admin' || hasPermission('manage_handler_groups');

  // Build sections based on role
  const sections = [];

  // My Work section
  const myWorkItems = [
    {
      label: "New Request",
      href: "/requests/new",
      icon: Plus,
      description: "Submit a new request"
    },
  ];

  // Add Pending Approvals for managers
  if (isManager) {
    myWorkItems.push({
      label: "Pending Approvals",
      href: "/approvals",
      icon: Clock,
      description: "Review pending approvals"
    });
  }

  // Add standard work items
  myWorkItems.push(
    { label: "Requests", href: "/requests", icon: FileText, description: "View all requests" },
    { label: "Tasks", href: "/mlo-tasks", icon: ListTodo, description: "Manage your tasks" },
    { label: "Reminders", href: "/reminders", icon: Bell, description: "View reminders" }
  );

  if (canManageHandlerGroups) {
    myWorkItems.push({ label: "Handler Groups", href: "/admin/handler-groups", icon: Users, description: "Manage handler groups" });
  }

  sections.push({
    title: "MY WORK",
    items: myWorkItems,
  });

  // Checklists section
  const checklistItems = [];
  checklistItems.push({ label: "Daily Checklist", href: "/checklists/daily", icon: CheckSquare, description: "Complete daily tasks" });

  if (isAdmin) {
    checklistItems.push({ label: "Template Library", href: "/admin/checklist-templates", icon: FileText, description: "Manage templates" });
  }

  sections.push({
    title: "CHECKLISTS",
    items: checklistItems,
  });

  // Services section
  const servicesItems = [];

  if (isFeatureEnabled('print_ordering')) {
    servicesItems.push({ label: "Print Order Forms", href: "/print-orders", icon: Printer, description: "Order printed materials" });
  }

  if (servicesItems.length > 0) {
    sections.push({
      title: "SERVICES",
      items: servicesItems,
    });
  }

  return (
    <MegaMenu
      sections={sections}
      width="w-[700px]"
      onClose={onClose}
    />
  );
}
