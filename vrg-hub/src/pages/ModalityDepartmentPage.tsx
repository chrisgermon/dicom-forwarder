import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRBAC } from "@/contexts/RBACContext";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { ModuleEditor } from "@/components/page-modules/ModuleEditor";
// Import header images
import xrayHeader from "@/assets/headers/xray-header.jpg";
import ctHeader from "@/assets/headers/ct-header.jpg";
import ultrasoundHeader from "@/assets/headers/ultrasound-header.jpg";
import mriHeader from "@/assets/headers/mri-header.jpg";
import mammographyHeader from "@/assets/headers/mammography-header.jpg";
import eosHeader from "@/assets/headers/eos-header.jpg";
import receptionHeader from "@/assets/headers/reception-header.jpg";
import medicalHeader from "@/assets/headers/medical-header.jpg";
import marketingHeader from "@/assets/headers/marketing-header.jpg";
import hrHeader from "@/assets/headers/hr-header.jpg";
import financeHeader from "@/assets/headers/finance-header.jpg";
import operationsHeader from "@/assets/headers/operations-header.jpg";

// Map page keys to their header images
const headerImages: Record<string, string> = {
  xray: xrayHeader,
  ct: ctHeader,
  ultrasound: ultrasoundHeader,
  mri: mriHeader,
  mammography: mammographyHeader,
  eos: eosHeader,
  reception: receptionHeader,
  medical: medicalHeader,
  marketing: marketingHeader,
  hr: hrHeader,
  finance: financeHeader,
  operations: operationsHeader,
};

interface PageData {
  id: string;
  page_type: string;
  page_key: string;
  title: string;
  content: string;
  icon: string | null;
  gradient: string | null;
}

export default function ModalityDepartmentPage() {
  const { key } = useParams<{ key: string }>();
  const location = useLocation();
  const type = location.pathname.startsWith("/modality") ? "modality" : "department";
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = useRBAC();
  
  // Determine the resource based on page type
  const resource = type === "modality" ? "modality_pages" : "department_pages";
  
  // Check if user can edit this page (has update or manage permission)
  const canEdit = isSuperAdmin || hasPermission(resource, "update") || hasPermission(resource, "manage");

  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPage();
  }, [type, key]);

  const loadPage = async () => {
    if (!type || !key) return;
    
    try {
      const { data, error } = await supabase
        .from("modality_department_pages")
        .select("*")
        .eq("page_type", type)
        .eq("page_key", key)
        .single();

      if (error) throw error;
      setPage(data);
    } catch (error) {
      console.error("Error loading page:", error);
      toast.error("Page not found");
    } finally {
      setLoading(false);
    }
  };

  // Get the icon component dynamically
  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return null;
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-7 w-7 text-white" /> : null;
  };

  // Get the header image for this page
  const getHeaderImage = (pageKey: string | undefined) => {
    if (!pageKey) return null;
    return headerImages[pageKey] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!page) {
    return (
      <PageContainer maxWidth="lg">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
          <Button onClick={() => navigate("/home")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
      </PageContainer>
    );
  }

  const headerImage = getHeaderImage(key);

  return (
    <PageContainer maxWidth="2xl" className="space-y-6">
      {/* Header with background image */}
      <div 
        className="relative rounded-xl overflow-hidden shadow-lg"
        style={{ minHeight: "180px" }}
      >
        {/* Background image */}
        {headerImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${headerImage})` }}
          />
        )}
        
        {/* Gradient overlay for readability */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r ${page.gradient || "from-primary/80 to-primary/60"} opacity-75`}
        />
        
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Content */}
        <div className="relative z-10 p-6 flex items-center h-full" style={{ minHeight: "180px" }}>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="text-white/90 hover:text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                {getIconComponent(page.icon)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-md">{page.title}</h1>
                <p className="text-white/80 text-sm capitalize mt-1">{page.page_type}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module-based Content Area */}
      <div className="bg-card rounded-xl border p-6 min-h-[400px]">
        <ModuleEditor pageId={page.id} canEdit={canEdit} />
      </div>
    </PageContainer>
  );
}
