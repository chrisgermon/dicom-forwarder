import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useClinicSetupChecklists, ClinicSetupItem, ClinicSetupSection } from "@/hooks/useClinicSetupChecklists";
import { useAuditLog } from "@/hooks/useAuditLog";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Plus, Users, Loader2, RefreshCw, 
  Download, LayoutDashboard, List, History 
} from "lucide-react";
import { toast } from "sonner";
import { ClinicSetupPermissionsPanel } from "@/components/clinic-setup/ClinicSetupPermissionsPanel";
import { ClinicSetupOverview } from "@/components/clinic-setup/ClinicSetupOverview";
import { ClinicSetupFilters } from "@/components/clinic-setup/ClinicSetupFilters";
import { ClinicSetupSectionCard } from "@/components/clinic-setup/ClinicSetupSectionCard";
import { ClinicSetupActivity } from "@/components/clinic-setup/ClinicSetupActivity";
import { CLINIC_SETUP_FORM_TEMPLATE, getDefaultItemsForSection } from "@/components/clinic-setup/clinicSetupFormTemplate";
import { exportClinicSetupToExcel } from "@/lib/exportClinicSetup";

export default function ClinicSetupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchChecklist, addSection, addItem, updateItem, updateSectionOwner, isAdmin } = useClinicSetupChecklists();
  const { logView } = useAuditLog();
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSection, setNewSection] = useState({ name: "", owner: "" });
  const [isInitializing, setIsInitializing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["clinic-setup-checklist", id],
    queryFn: () => fetchChecklist(id!),
    enabled: !!id,
  });

  // Log view when checklist is loaded
  useEffect(() => {
    if (data?.checklist && id) {
      logView('clinic_setup_checklists', id, { clinic_name: data.checklist.clinic_name });
    }
  }, [data?.checklist, id, logView]);

  // Filter sections and items
  const filteredSections = useMemo(() => {
    if (!data?.sections) return [];

    return data.sections
      .filter(section => {
        // Section filter
        if (selectedSection !== "all" && section.id !== selectedSection) return false;
        // Owner filter (match by section_owner_id or section_owner text)
        if (selectedOwner !== "all") {
          const matchesOwnerId = section.section_owner_id === selectedOwner;
          const matchesOwnerName = section.section_owner === selectedOwner;
          if (!matchesOwnerId && !matchesOwnerName) return false;
        }
        return true;
      })
      .map(section => ({
        ...section,
        filteredItems: (section.items || []).filter(item => {
          // Search filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = item.field_name.toLowerCase().includes(query);
            const matchesValue = item.field_value?.toLowerCase().includes(query);
            const matchesNotes = item.notes?.toLowerCase().includes(query);
            if (!matchesName && !matchesValue && !matchesNotes) return false;
          }
          // Status filter
          if (statusFilter === "completed" && !item.is_completed) return false;
          if (statusFilter === "pending" && item.is_completed) return false;
          return true;
        }),
      }));
  }, [data?.sections, searchQuery, selectedOwner, selectedSection, statusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedOwner("all");
    setSelectedSection("all");
    setStatusFilter("all");
  };

  // Initialize all sections and fields from the template
  const handleInitializeFromTemplate = async () => {
    if (!id) return;
    
    setIsInitializing(true);
    try {
      for (let i = 0; i < CLINIC_SETUP_FORM_TEMPLATE.length; i++) {
        const templateSection = CLINIC_SETUP_FORM_TEMPLATE[i];
        
        // Create section
        const sectionResult = await addSection.mutateAsync({
          checklist_id: id,
          section_name: templateSection.name,
          section_owner: templateSection.owner,
          sort_order: i,
        });
        
        // Add all fields for this section
        const defaultItems = getDefaultItemsForSection(templateSection);
        for (let j = 0; j < defaultItems.length; j++) {
          const item = defaultItems[j];
          await addItem.mutateAsync({
            section_id: sectionResult.id,
            field_name: item.field_name,
            field_type: item.field_type,
            field_options: item.field_options,
            sort_order: j,
          });
        }
      }
      
      refetch();
      toast.success("Checklist initialized with all sections and fields");
    } catch (error) {
      console.error(error);
      toast.error("Failed to initialize checklist");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAddSection = async () => {
    if (!id || !newSection.name) return;
    
    await addSection.mutateAsync({
      checklist_id: id,
      section_name: newSection.name,
      section_owner: newSection.owner,
      sort_order: (data?.sections?.length || 0) + 1,
    });
    
    setNewSection({ name: "", owner: "" });
    setIsAddSectionOpen(false);
    refetch();
  };

  const handleUpdateItem = async (item: ClinicSetupItem, updates: Partial<ClinicSetupItem>) => {
    await updateItem.mutateAsync({
      id: item.id,
      field_value: updates.field_value ?? item.field_value,
      is_completed: updates.is_completed ?? item.is_completed,
      notes: updates.notes ?? item.notes,
      checklistId: id,
    });
    refetch();
  };

  const handleMarkSectionComplete = async (section: ClinicSetupSection) => {
    const pendingItems = section.items?.filter(i => !i.is_completed) || [];
    for (const item of pendingItems) {
      await updateItem.mutateAsync({
        id: item.id,
        is_completed: true,
        checklistId: id,
      });
    }
    refetch();
    toast.success(`Marked ${pendingItems.length} items as complete`);
  };

  const handleExport = () => {
    if (!data) return;
    exportClinicSetupToExcel(data.checklist, data.sections);
    toast.success("Exported to Excel");
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl" className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer maxWidth="xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Checklist not found</p>
            <Button className="mt-4" onClick={() => navigate("/clinic-setup")}>
              Back to Checklists
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const { checklist, sections } = data;

  // Calculate completion stats
  const totalItems = sections.reduce((acc, s) => acc + (s.items?.length || 0), 0);
  const completedItems = sections.reduce(
    (acc, s) => acc + (s.items?.filter(i => i.is_completed).length || 0),
    0
  );
  const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title={checklist.clinic_name}
        description={`${checklist.status.replace("_", " ")} • ${completionPercent}% complete • ${completedItems}/${totalItems} items`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => navigate("/clinic-setup")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2">
            <List className="h-4 w-4" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <History className="h-4 w-4" />
            Activity
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="permissions" className="gap-2">
              <Users className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <ClinicSetupOverview checklist={checklist} sections={sections} />
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4 mt-6">
          {sections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No sections yet. Initialize the checklist with the standard template to get started.
                </p>
                {isAdmin && (
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button onClick={handleInitializeFromTemplate} disabled={isInitializing}>
                      {isInitializing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Initialize from Template
                    </Button>
                    <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Custom Section
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Section</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Section Name *</Label>
                            <Input
                              value={newSection.name}
                              onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                              placeholder="e.g., Entity Setup"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Owner</Label>
                            <Input
                              value={newSection.owner}
                              onChange={(e) => setNewSection({ ...newSection, owner: e.target.value })}
                              placeholder="e.g., Mays"
                            />
                          </div>
                          <Button onClick={handleAddSection} disabled={!newSection.name}>
                            Add Section
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filters & Actions */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <ClinicSetupFilters
                    sections={sections}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedOwner={selectedOwner}
                    onOwnerChange={setSelectedOwner}
                    selectedSection={selectedSection}
                    onSectionChange={setSelectedSection}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    onClearFilters={clearFilters}
                  />
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Section
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Section</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Section Name *</Label>
                            <Input
                              value={newSection.name}
                              onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                              placeholder="e.g., Entity Setup"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Owner</Label>
                            <Input
                              value={newSection.owner}
                              onChange={(e) => setNewSection({ ...newSection, owner: e.target.value })}
                              placeholder="e.g., Mays"
                            />
                          </div>
                          <Button onClick={handleAddSection} disabled={!newSection.name}>
                            Add Section
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>

              {/* Sections */}
              <div className="space-y-4">
                {filteredSections.map((section, index) => (
                  <ClinicSetupSectionCard
                    key={section.id}
                    section={section}
                    filteredItems={section.filteredItems}
                    onUpdateItem={handleUpdateItem}
                    onUpdateSectionOwner={async (sectionId, ownerId) => {
                      await updateSectionOwner.mutateAsync({ sectionId, ownerId });
                      refetch();
                    }}
                    defaultOpen={index < 2}
                    onMarkAllComplete={() => handleMarkSectionComplete(section)}
                    isAdmin={isAdmin}
                  />
                ))}

                {filteredSections.length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No sections match your filters</p>
                      <Button variant="ghost" className="mt-2" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <ClinicSetupActivity checklistId={id!} />
        </TabsContent>

        {/* Permissions Tab */}
        {isAdmin && (
          <TabsContent value="permissions" className="mt-6">
            <ClinicSetupPermissionsPanel checklistId={id!} />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
