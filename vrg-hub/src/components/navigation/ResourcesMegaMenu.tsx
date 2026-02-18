import { MegaMenu } from "./MegaMenu";
import {
  FolderOpen,
  Phone,
  FileText,
  Users,
  ClipboardList,
  HeartHandshake,
  Newspaper,
  HelpCircle,
  Mail,
  HardDrive,
  Table,
  ScrollText,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface ResourcesMegaMenuProps {
  onClose?: () => void;
}

export function ResourcesMegaMenu({ onClose }: ResourcesMegaMenuProps) {
  const { isFeatureEnabled } = usePermissions();

  const sections = [];

  // Documents & Info section
  sections.push({
    title: "DOCUMENTS & INFO",
    items: [
      { label: "File Directory", href: "/company-documents", icon: FolderOpen },
      { label: "Phone Directory", href: "/directory", icon: Phone },
      { label: "Mission Statement", href: "/mission-statement", icon: FileText },
      { label: "External Providers", href: "/external-providers", icon: Users },
    ],
  });

  // People & Scheduling section
  sections.push({
    title: "PEOPLE & SCHEDULING",
    items: [
      { label: "Rosters", href: "/rosters", icon: ClipboardList },
      { label: "HR & Employee Assistance", href: "/hr-assistance", icon: HeartHandshake },
      { label: "CPD Tracker", href: "/cpd-tracker", icon: ScrollText },
    ],
  });

  // Office 365 section
  sections.push({
    title: "OFFICE 365",
    items: [
      { label: "Outlook", href: "https://outlook.office.com", icon: Mail, external: true },
      { label: "OneDrive", href: "https://www.office.com/launch/onedrive", icon: HardDrive, external: true },
      { label: "Word", href: "https://www.office.com/launch/word", icon: FileText, external: true },
      { label: "Excel", href: "https://www.office.com/launch/excel", icon: Table, external: true },
    ],
  });

  // Communication section
  const communicationItems = [];

  communicationItems.push({ label: "News", href: "/news", icon: Newspaper });

  if (isFeatureEnabled('monthly_newsletter')) {
    communicationItems.push({ label: "Monthly Newsletter", href: "/newsletter", icon: Newspaper });
  }

  communicationItems.push({ label: "Help", href: "/help", icon: HelpCircle });

  sections.push({
    title: "COMMUNICATION",
    items: communicationItems,
  });

  return (
    <MegaMenu
      sections={sections}
      width="w-[700px]"
      onClose={onClose}
    />
  );
}
