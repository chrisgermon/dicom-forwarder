import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  HeartHandshake, 
  FileText, 
  AlertTriangle, 
  Globe, 
  Download,
  Phone,
  ExternalLink,
  Shield,
  Loader2,
  LockKeyhole,
  Link2,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import eapQrCode from "@/assets/eap-qr-code.png";

interface DocumentFile {
  name: string;
  id: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface DocumentMapping {
  id: string;
  document_key: string;
  file_path: string;
  category: string;
}

export default function HRAssistance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [hrFiles, setHrFiles] = useState<DocumentFile[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [editingDoc, setEditingDoc] = useState<{ key: string; category: string; currentPath?: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Check permissions
  const canViewHRDocs = hasPermission("view_hr_documents");
  const canAccessEAP = hasPermission("access_eap_program");
  const canViewEmployeeAssistance = hasPermission("view_employee_assistance");
  const isSuperAdmin = hasPermission("manage_system_settings");

  // By default, all users should have access
  const hasAccess = canViewHRDocs || canAccessEAP || canViewEmployeeAssistance;
  // Load HR documents from storage
  useEffect(() => {
    if (user) {
      loadHRDocuments();
      loadMappings();
    }
  }, [user]);

  const loadMappings = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_document_mappings")
        .select("*");

      if (error) throw error;

      const mappingsMap: Record<string, string> = {};
      (data || []).forEach((mapping: DocumentMapping) => {
        mappingsMap[mapping.document_key] = mapping.file_path;
      });
      setMappings(mappingsMap);
    } catch (error: any) {
      console.error("Error loading mappings:", error);
    }
  };

  const loadHRDocuments = async () => {
    try {
      setLoading(true);
      
      // Load all documents from the entire documents bucket
      const allFiles: DocumentFile[] = [];
      
      // Recursively load files from all folders
      const loadFolder = async (path: string) => {
        const { data, error } = await supabase.storage
          .from("documents")
          .list(path, {
            sortBy: { column: "name", order: "asc" },
          });

        if (error) throw error;

        for (const item of data || []) {
          if (item.id === null) {
            // It's a folder, recurse into it
            await loadFolder(`${path}${item.name}/`);
          } else if (item.name !== '.keep') {
            // It's a file
            allFiles.push({
              ...item,
              name: `${path}${item.name}`, // Store full path
              id: item.id,
              created_at: item.created_at || new Date().toISOString(),
              metadata: item.metadata
            } as DocumentFile);
          }
        }
      };

      await loadFolder("shared/");
      setHrFiles(allFiles);
    } catch (error: any) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDocument = async (fileName: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access documents",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(fileName, 3600); // fileName now includes full path

      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      console.error("Error opening document:", error);
      toast({
        title: "Error",
        description: "Failed to open document. Please ensure the file exists.",
        variant: "destructive",
      });
    }
  };

  const findDocument = (searchName: string): DocumentFile | undefined => {
    // First check if there's a mapping
    const mappedPath = mappings[searchName];
    if (mappedPath) {
      return hrFiles.find((file) => file.name === mappedPath);
    }
    // Fallback to direct filename match
    return hrFiles.find((file) => file.name === searchName);
  };

  const openEditDialog = (docKey: string, category: string) => {
    const currentPath = mappings[docKey];
    setEditingDoc({ key: docKey, category, currentPath });
    setSelectedFile(currentPath || "");
    setSearchQuery(""); // Reset search when opening dialog
  };

  const saveMapping = async () => {
    if (!editingDoc || !selectedFile) return;

    try {
      const { error } = await supabase
        .from("hr_document_mappings")
        .upsert({
          document_key: editingDoc.key,
          file_path: selectedFile,
          category: editingDoc.category,
        }, {
          onConflict: 'document_key'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document mapping saved successfully",
      });

      await loadMappings();
      setEditingDoc(null);
      setSelectedFile("");
      setSearchQuery("");
    } catch (error: any) {
      console.error("Error saving mapping:", error);
      toast({
        title: "Error",
        description: "Failed to save document mapping",
        variant: "destructive",
      });
    }
  };

  // EAP Information
  const eapAccessCode = "0407086000";
  const companyName = "Vision Radiology Group";
  const eapWebsite = "https://eapassist.com.au/";

  const eapFeatures = [
    "Confidential counselling for personal or work-related issues",
    "Health and wellness resources",
    "Work-life balance guidance",
    "Referrals for specialised services as needed"
  ];

  const eapLinks = [
    {
      title: "EAP Official Website",
      description: "Access counselling and wellness programs",
      url: eapWebsite,
      icon: Globe,
      external: true
    },
    {
      title: "Whistleblower Program",
      description: "Report concerns confidentially",
      url: "https://eapassist.com.au/whistleblower-program/",
      icon: Shield,
      external: true
    },
    {
      title: "EAP Assist Flyer",
      description: "Download program information",
      url: "shared/EAP Assist/EAP ASSIST.pdf",
      icon: Download,
      external: false
    }
  ];

  // HR Documents organized by category - these will link to actual files
  const hrDocuments = {
    organisational: [
      { name: "VR Group Organisational Support Centre Chart", icon: FileText, fileName: "VR-Group-Organisational-Support-Centre-Chart" },
      { name: "VR-Clinic-Workflow-Chart", icon: FileText, fileName: "VR-Clinic-Workflow-Chart" }
    ],
    forms: [
      { name: "Vision-Radiology---Employee-Induction-V2", icon: FileText, fileName: "Vision-Radiology---Employee-Induction-V2" },
      { name: "Employee-Led-Check-In", icon: FileText, fileName: "Employee-Led-Check-In" },
      { name: "Change of Bank Account Form", icon: FileText, fileName: "Change-of-Bank-Account-Form" },
      { name: "Maternity leave application letter", icon: FileText, fileName: "Maternity-leave-application-letter" }
    ],
    policies: [
      { name: "Responsibilities for incident management", icon: FileText, fileName: "Responsibilities-for-incident-management" },
      { name: "VRG Workflow for Addressing Incidents", icon: FileText, fileName: "VRG-Workflow-for-Addressing-Incidents" },
      { name: "VRG-HR-Policy-Manual-V2", icon: FileText, fileName: "VRG-HR-Policy-Manual-V2" },
      { name: "VRG_WHS Policy Statement", icon: FileText, fileName: "VRG_WHS-Policy-Statement" },
      { name: "Respectful Workplace Training - VRG Group", icon: FileText, fileName: "Respectful-Workplace-Training-VRG-Group" },
      { name: "VRG Work Health Safety Management System Manual", icon: FileText, fileName: "VRG-Work-Health-Safety-Management-System-Manual" },
      { name: "Vision Radiology Saturday Urgent Reports Procedure", icon: FileText, fileName: "Vision-Radiology-Saturday-Urgent-Reports-Procedure" },
      { name: "Contrast Media Administration Policy", icon: FileText, fileName: "Contrast-Media-Administration-Policy" },
      { name: "Managing Risk Of Potential Cross Infection", icon: FileText, fileName: "Managing-Risk-Of-Potential-Cross-Infection" }
    ]
  };

  const handleDocumentClick = (fileName: string) => {
    const doc = findDocument(fileName);
    if (doc) {
      openDocument(doc.name);
    } else {
      toast({
        title: "Document not found",
        description: "This document hasn't been uploaded yet. Please contact HR.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Employee Assistance Program"
        description="Access support resources, wellness programs, and HR documents"
      />

      {!hasAccess && (
        <Alert className="border-destructive/50">
          <LockKeyhole className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access HR & Employee Assistance resources. 
            Please contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* EAP Assist Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <HeartHandshake className="h-6 w-6 text-primary" />
                EAP Assist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                The EAP offers confidential counselling services, wellness programs, and many other helpful 
                resources, all at no cost to you. Whether you're dealing with stress, personal challenges, 
                relationship concerns, or work-related issues, our EAP is here to assist you in finding 
                practical solutions. The services are available to you and your immediate family members, 
                ensuring comprehensive support.
              </p>

              <div>
                <h3 className="font-semibold mb-3">Key Features of the EAP Include:</h3>
                <ul className="space-y-2">
                  {eapFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  EAP Assist counsellors are all qualified and highly experienced and will initially ask for 
                  your name as well as that of your employer details in order to verify eligibility for 
                  services. Information obtained during counselling is totally confidential & will not be 
                  released to any third party without prior written consent.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">
                  The EAP Assist website also contains an extensive range of self-help resources including 
                  digital treatment programs, apps & wellness challenges for employees to access:{" "}
                  <a 
                    href={eapWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {eapWebsite}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-primary">Confidentiality Guarantee</p>
                <p className="text-sm text-muted-foreground">
                  The program is confidential, and no personal information will be shared with the company 
                  without your permission.
                </p>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                We encourage you to take full advantage of this valuable resource. Our goal is to help you 
                maintain a healthy balance in all aspects of your life, which ultimately leads to a more 
                productive and positive work environment.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                If you have any questions or would like more information, please don't hesitate to reach out 
                to any of one of the leadership team, or visit{" "}
                <a 
                  href={`${eapWebsite}/faqs/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {eapWebsite}/faqs/
                  <ExternalLink className="h-3 w-3" />
                </a>.
              </p>
            </CardContent>
          </Card>

          {/* HR Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6 text-primary" />
                Policy and HR Documents
              </CardTitle>
              <CardDescription>
                Access important company policies, forms, and procedures
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading HR documents...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Organisational Charts */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      VR Organisational Chart
                    </h3>
                    <div className="grid gap-2">
                      {hrDocuments.organisational.map((doc, index) => (
                        <div key={index} className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 justify-start text-left h-auto py-3 px-3"
                            onClick={() => handleDocumentClick(doc.fileName)}
                            disabled={!findDocument(doc.fileName)}
                          >
                            <doc.icon className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                            <span className="text-sm break-words">{doc.name}</span>
                            {mappings[doc.fileName] && (
                              <Link2 className="h-3 w-3 ml-auto text-green-500" />
                            )}
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(doc.fileName, "organisational")}
                              title="Link to file"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* HR Forms */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      HR Forms
                    </h3>
                    <div className="grid gap-2">
                      {hrDocuments.forms.map((doc, index) => (
                        <div key={index} className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 justify-start text-left h-auto py-3 px-3"
                            onClick={() => handleDocumentClick(doc.fileName)}
                            disabled={!findDocument(doc.fileName)}
                          >
                            <doc.icon className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                            <span className="text-sm break-words">{doc.name}</span>
                            {mappings[doc.fileName] && (
                              <Link2 className="h-3 w-3 ml-auto text-green-500" />
                            )}
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(doc.fileName, "forms")}
                              title="Link to file"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Policies & Procedures */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Policies | Procedures | Training
                    </h3>
                    <div className="grid gap-2">
                      {hrDocuments.policies.map((doc, index) => (
                        <div key={index} className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 justify-start text-left h-auto py-3 px-3"
                            onClick={() => handleDocumentClick(doc.fileName)}
                            disabled={!findDocument(doc.fileName)}
                          >
                            <doc.icon className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                            <span className="text-sm break-words">{doc.name}</span>
                            {mappings[doc.fileName] && (
                              <Link2 className="h-3 w-3 ml-auto text-green-500" />
                            )}
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(doc.fileName, "policies")}
                              title="Link to file"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Report Workplace Incident - Featured at top */}
              <Button
                onClick={() => window.open('/incident-form', '_blank')}
                className="w-full justify-start text-left h-auto py-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start gap-3 w-full">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-0.5 flex items-center gap-1">
                      Report Workplace Incident
                      <ExternalLink className="h-3 w-3" />
                    </div>
                    <div className="text-xs opacity-90">
                      Submit an incident report confidentially
                    </div>
                  </div>
                </div>
              </Button>

              {/* Other Quick Links */}
              {eapLinks.map((link, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4"
                  onClick={async () => {
                    if (link.external) {
                      window.open(link.url, '_blank', 'noopener,noreferrer');
                    } else {
                      // Handle EAP Assist Flyer document
                      try {
                        const { data, error } = await supabase.storage
                          .from("documents")
                          .createSignedUrl(link.url, 3600);
                        
                        if (error) throw error;
                        window.open(data.signedUrl, "_blank");
                      } catch (error) {
                        console.error("Error opening document:", error);
                        toast({
                          title: "Error",
                          description: "Failed to open document.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                >
                  <div className="flex items-start gap-3 w-full">
                    <link.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-0.5 flex items-center gap-1">
                        {link.title}
                        {link.external && <ExternalLink className="h-3 w-3" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {link.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Access EAP Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  To access up to three hours of telephone counselling from 9am - 9pm Monday - Saturday, 
                  scan the below QR Code:
                </p>
                <div className="bg-white rounded-lg p-4 flex items-center justify-center border-2 border-primary/20">
                  <img 
                    src={eapQrCode} 
                    alt="EAP Assist QR Code" 
                    className="w-48 h-auto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">Allocated Access Code:</span>
                  <code className="bg-background px-2 py-1 rounded border font-mono">
                    {eapAccessCode}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Registered company name:</span>
                  <p className="text-muted-foreground">{companyName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Mapping Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={() => {
        setEditingDoc(null);
        setSearchQuery("");
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Document to File</DialogTitle>
            <DialogDescription>
              Select the actual file from storage to link to this document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document:</label>
              <p className="text-sm text-muted-foreground">{editingDoc?.key}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Files:</label>
              <Input
                placeholder="Type to search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select File:</label>
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a file..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-background z-50">
                  {hrFiles
                    .filter((file) => 
                      searchQuery === "" || 
                      file.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((file) => (
                      <SelectItem key={file.id} value={file.name}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  {hrFiles.filter((file) => 
                    searchQuery === "" || 
                    file.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No files found
                    </div>
                  )}
                </SelectContent>
              </Select>
              {searchQuery && (
                <p className="text-xs text-muted-foreground">
                  Showing {hrFiles.filter((file) => 
                    file.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length} of {hrFiles.length} files
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingDoc(null);
              setSearchQuery("");
            }}>
              Cancel
            </Button>
            <Button onClick={saveMapping} disabled={!selectedFile}>
              Save Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
