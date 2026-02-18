import { MegaMenu } from "./MegaMenu";
import {
  Search,
  Network,
  Calculator,
  FileSearch,
  FileOutput,
  HardDrive,
  QrCode,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface ToolsMegaMenuProps {
  onClose?: () => void;
}

export function ToolsMegaMenu({ onClose }: ToolsMegaMenuProps) {
  const { userRole } = useAuth();
  const { hasPermission, isFeatureEnabled } = usePermissions();

  const sections = [];

  // Search & Lookup Tools
  const searchTools = [
    { label: "Referrer Lookup", href: "/referrer-lookup", icon: Search },
  ];

  if (userRole === 'super_admin') {
    searchTools.push({ label: "Radiology Search", href: "/radiology-search", icon: FileSearch });
  }

  sections.push({
    title: "SEARCH & LOOKUP",
    items: searchTools,
  });

  // System Tools
  const systemTools = [
    { label: "QR Code Generator", href: "/qr-code-generator", icon: QrCode },
    { label: "Doc2Dicom", href: "/d2d-converter", icon: FileOutput },
    { label: "DICOM Upload", href: "/dicom-upload", icon: HardDrive },
  ];

  if (isFeatureEnabled('modality_management') && hasPermission('view_modality_details')) {
    systemTools.push({ label: "Modality Details", href: "/modality-management", icon: Network });
  }

  sections.push({
    title: "SYSTEM TOOLS",
    items: systemTools,
  });

  // Admin Tools (super admin only)
  if (userRole === 'super_admin') {
    sections.push({
      title: "ADMIN TOOLS",
      items: [
        { label: "Audit Log", href: "/audit-log", icon: FileSearch },
        { label: "Integrations", href: "/integrations", icon: Network },
        { label: "Analytics AI", href: "/analytics-ai", icon: Calculator },
      ],
    });
  }

  return (
    <MegaMenu
      sections={sections}
      width="w-[500px]"
      onClose={onClose}
    />
  );
}
