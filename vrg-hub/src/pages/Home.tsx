import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Megaphone, Briefcase, DollarSign, Scan, Activity, Heart, Brain, Microscope, Bone, Link, Settings, ExternalLink, Settings2 } from "lucide-react";

import { NewsUpdatesCard } from "@/components/home/NewsUpdatesCard";
import { QuickLinksCard } from "@/components/home/QuickLinksCard";
import { UpcomingEventsCard } from "@/components/home/UpcomingEventsCard";
import { PageContainer } from "@/components/ui/page-container";
import { GradientBlobs } from "@/components/ui/gradient-blobs";
import synapseMixLogo from "@/assets/synapse-mix-logo.png";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { ShortcutLinkConfigDialog } from "@/components/home/ShortcutLinkConfigDialog";
import { useShortcutLinks } from "@/hooks/useShortcutLinks";

const modalities = [
  { name: "X-Ray", key: "xray", icon: Scan, gradient: "from-modality-xray to-modality-xray/80" },
  { name: "CT", key: "ct", icon: Activity, gradient: "from-modality-ct to-modality-ct/80" },
  { name: "Ultrasound", key: "ultrasound", icon: Heart, gradient: "from-modality-ultrasound to-modality-ultrasound/80" },
  { name: "MRI", key: "mri", icon: Brain, gradient: "from-modality-mri to-modality-mri/80" },
  { name: "Mammography", key: "mammography", icon: Microscope, gradient: "from-modality-mammography to-modality-mammography/80" },
  { name: "EOS", key: "eos", icon: Bone, gradient: "from-modality-eos to-modality-eos/80" },
];

const departments = [
  { name: "Reception", key: "reception", icon: Building2, gradient: "from-department-reception to-department-reception/80" },
  { name: "Medical", key: "medical", icon: Users, gradient: "from-department-medical to-department-medical/80" },
  { name: "Marketing", key: "marketing", icon: Megaphone, gradient: "from-department-marketing to-department-marketing/80" },
  { name: "HR", key: "hr", icon: Briefcase, gradient: "from-department-hr to-department-hr/80" },
  { name: "Finance", key: "finance", icon: DollarSign, gradient: "from-department-finance to-department-finance/80" },
  { name: "Operations", key: "operations", icon: Settings2, gradient: "from-department-operations to-department-operations/80" },
];

interface ShortcutConfigState {
  open: boolean;
  type: "modality" | "department";
  key: string;
  name: string;
}

export default function Home() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = userRole === 'super_admin';
  
  const { getLinkUrl, getLink, refetch } = useShortcutLinks();
  
  const [configDialog, setConfigDialog] = useState<ShortcutConfigState>({
    open: false,
    type: "modality",
    key: "",
    name: "",
  });

  const handleShortcutClick = (type: "modality" | "department", key: string) => {
    const url = getLinkUrl(type, key);
    if (url) {
      if (url.startsWith("http")) {
        window.open(url, "_blank");
      } else {
        navigate(url);
      }
    } else {
      // Navigate to the modality/department page by default
      navigate(`/${type}/${key}`);
    }
  };

  const openConfigDialog = (type: "modality" | "department", key: string, name: string) => {
    setConfigDialog({ open: true, type, key, name });
  };

  const renderShortcutButton = (
    item: { name: string; key: string; icon: React.ElementType; gradient: string },
    type: "modality" | "department"
  ) => {
    const link = getLink(type, item.key);
    const hasLink = !!link;

    const button = (
      <button
        onClick={() => handleShortcutClick(type, item.key)}
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r ${item.gradient} text-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 w-full relative`}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
        <span className="text-sm font-medium truncate">{item.name}</span>
        {hasLink && (
          <Link className="h-3 w-3 absolute top-1.5 right-1.5 opacity-60" />
        )}
      </button>
    );

    if (!isSuperAdmin) {
      return <div key={item.key}>{button}</div>;
    }

    return (
      <ContextMenu key={item.key}>
        <ContextMenuTrigger asChild>
          {button}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuLabel className="flex items-center gap-2">
            <item.icon className="h-4 w-4" />
            {item.name}
          </ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => navigate(`/${type}/${item.key}`)}
            className="cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Page
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => openConfigDialog(type, item.key, item.name)}
            className="cursor-pointer"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Link
          </ContextMenuItem>
          {link && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem disabled className="text-xs text-muted-foreground">
                {link.link_type === "url" && `URL: ${link.link_url?.slice(0, 30)}...`}
                {link.link_type === "sharepoint" && `SharePoint: ${link.sharepoint_path}`}
                {link.link_type === "internal" && `Route: ${link.internal_route}`}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <>
      {/* Gradient blobs background - only visible in dark mode */}
      <div className="hidden dark:block">
        <GradientBlobs variant="default" />
      </div>
      
      <PageContainer maxWidth="xl" className="space-y-6 relative z-10">
        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Modalities - Horizontal pill layout in 2 rows */}
          <div className="col-span-12 lg:col-span-6">
            <div className="glass-card dark:glass-card-glow p-6 bg-card dark:bg-transparent">
              <h3 className="text-base font-semibold text-foreground mb-4">Modalities</h3>
              <div className="grid grid-cols-3 gap-3">
                {modalities.map((modality) => renderShortcutButton(modality, "modality"))}
              </div>
            </div>
          </div>

          {/* Departments - Horizontal pill layout in 2 rows */}
          <div className="col-span-12 lg:col-span-6">
            <div className="glass-card dark:glass-card-glow p-6 bg-card dark:bg-transparent">
              <h3 className="text-base font-semibold text-foreground mb-4">Departments</h3>
              <div className="grid grid-cols-3 gap-3">
                {departments.map((dept) => renderShortcutButton(dept, "department"))}
              </div>
            </div>
          </div>

        {/* News & Updates */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <NewsUpdatesCard />
        </div>

        {/* Upcoming Events */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <UpcomingEventsCard />
        </div>

        {/* Quick Links */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <QuickLinksCard />
        </div>

          {/* External Tools Row */}
          <div className="col-span-12">
            <div className="glass-card dark:glass-card-glow p-6 bg-card dark:bg-transparent">
              <h3 className="text-base font-semibold text-foreground mb-4">External Tools</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <a
                  href="http://10.17.10.10:5214/mix/Pages/SignIn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <img
                    src={synapseMixLogo}
                    alt="Synapse Mix"
                    className="h-4 w-4 object-contain"
                  />
                  <span className="text-sm font-medium truncate">Synapse Mix</span>
                </a>
                <a
                  href="https://pacs.visionradiology.com.au/InteleBrowser"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <ExternalLink className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
                  <span className="text-sm font-medium truncate">InteleBrowser</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Config Dialog */}
        <ShortcutLinkConfigDialog
          open={configDialog.open}
          onOpenChange={(open) => setConfigDialog((prev) => ({ ...prev, open }))}
          shortcutType={configDialog.type}
          shortcutKey={configDialog.key}
          shortcutName={configDialog.name}
          onSaved={refetch}
        />
      </PageContainer>
    </>
  );
}