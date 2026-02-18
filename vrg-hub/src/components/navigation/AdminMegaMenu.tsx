import { MegaMenu } from "./MegaMenu";
import {
  Building2,
  Settings,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AdminMegaMenuProps {
  onClose?: () => void;
}

export function AdminMegaMenu({ onClose }: AdminMegaMenuProps) {
  const { userRole } = useAuth();

  const isSuperAdmin = userRole === 'super_admin';
  const isTenantAdmin = userRole === 'tenant_admin';

  if (!isSuperAdmin && !isTenantAdmin) {
    return null;
  }

  const sections = [];

  // Site Management section
  const siteManagementItems = [
    { label: "Clinic Setup", href: "/clinic-setup", icon: Building2 },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "User Management", href: "/user-roles", icon: UserCog },
  ];

  sections.push({
    title: "SITE MANAGEMENT",
    items: siteManagementItems,
  });

  return (
    <MegaMenu
      sections={sections}
      width="w-[400px]"
      onClose={onClose}
    />
  );
}
