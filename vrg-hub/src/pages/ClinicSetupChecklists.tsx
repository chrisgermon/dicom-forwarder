import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClinicSetupChecklists } from "@/hooks/useClinicSetupChecklists";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Calendar, Building2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function ClinicSetupChecklists() {
  const navigate = useNavigate();
  const { checklists, checklistsLoading, isAdmin, createChecklist, deleteChecklist } = useClinicSetupChecklists();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChecklist, setNewChecklist] = useState({
    clinic_name: "",
    go_live_date: "",
    lease_handover_date: "",
    brand_id: "",
  });

  const { data: brands } = useQuery({
    queryKey: ["brands-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, display_name")
        .eq("is_active", true)
        .order("display_name");
      if (error) throw error;
      return data;
    },
  });

  const handleCreate = async () => {
    await createChecklist.mutateAsync({
      clinic_name: newChecklist.clinic_name,
      go_live_date: newChecklist.go_live_date || null,
      lease_handover_date: newChecklist.lease_handover_date || null,
      brand_id: newChecklist.brand_id || null,
    });
    setIsCreateOpen(false);
    setNewChecklist({ clinic_name: "", go_live_date: "", lease_handover_date: "", brand_id: "" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-600">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  if (checklistsLoading) {
    return (
      <PageContainer maxWidth="lg" className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="lg" className="space-y-6">
      <PageHeader
        title="Clinic Setup Checklists"
        description="Manage setup checklists for new clinic openings"
        actions={
          isAdmin && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Checklist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Clinic Setup Checklist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinic_name">Clinic Name *</Label>
                    <Input
                      id="clinic_name"
                      placeholder="e.g., QMI Victoria Point"
                      value={newChecklist.clinic_name}
                      onChange={(e) => setNewChecklist({ ...newChecklist, clinic_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Select
                      value={newChecklist.brand_id}
                      onValueChange={(value) => setNewChecklist({ ...newChecklist, brand_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands?.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="go_live_date">Go Live Date</Label>
                    <Input
                      id="go_live_date"
                      type="date"
                      value={newChecklist.go_live_date}
                      onChange={(e) => setNewChecklist({ ...newChecklist, go_live_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lease_handover_date">Lease Handover Date</Label>
                    <Input
                      id="lease_handover_date"
                      value={newChecklist.lease_handover_date}
                      onChange={(e) => setNewChecklist({ ...newChecklist, lease_handover_date: e.target.value })}
                      placeholder="e.g., 1st September 2025"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreate}
                    disabled={!newChecklist.clinic_name || createChecklist.isPending}
                  >
                    {createChecklist.isPending ? "Creating..." : "Create Checklist"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {!checklists || checklists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Checklists Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first clinic setup checklist to get started.
            </p>
            {isAdmin && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Checklist
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {checklists.map((checklist) => (
            <Card
              key={checklist.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/clinic-setup/${checklist.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {checklist.clinic_name}
                    {getStatusBadge(checklist.status)}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {checklist.brand?.display_name || "No brand assigned"}
                  </CardDescription>
                </div>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Checklist</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{checklist.clinic_name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteChecklist.mutate(checklist.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  {checklist.go_live_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Go Live: {format(new Date(checklist.go_live_date), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {checklist.lease_handover_date && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span>Lease Handover: {checklist.lease_handover_date}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
