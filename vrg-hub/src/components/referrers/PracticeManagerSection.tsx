import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PracticeManager {
  id: string;
  clinic_key: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PracticeManagerSectionProps {
  clinicKey: number;
}

export function PracticeManagerSection({ clinicKey }: PracticeManagerSectionProps) {
  const [managers, setManagers] = useState<PracticeManager[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PracticeManager | null>(null);
  const [editingManager, setEditingManager] = useState<Partial<PracticeManager> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clinic_practice_managers")
        .select("*")
        .eq("clinic_key", clinicKey)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error("Error fetching practice managers:", error);
      toast.error("Failed to load practice managers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, [clinicKey]);

  const handleAdd = () => {
    setEditingManager({
      clinic_key: clinicKey,
      name: "",
      email: "",
      phone: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (manager: PracticeManager) => {
    setEditingManager({ ...manager });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingManager?.name?.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingManager.id) {
        // Update existing
        const { error } = await supabase
          .from("clinic_practice_managers")
          .update({
            name: editingManager.name.trim(),
            email: editingManager.email?.trim() || null,
            phone: editingManager.phone?.trim() || null,
            notes: editingManager.notes?.trim() || null,
          })
          .eq("id", editingManager.id);

        if (error) throw error;
        toast.success("Practice manager updated");
      } else {
        // Create new
        const { error } = await supabase
          .from("clinic_practice_managers")
          .insert({
            clinic_key: clinicKey,
            name: editingManager.name.trim(),
            email: editingManager.email?.trim() || null,
            phone: editingManager.phone?.trim() || null,
            notes: editingManager.notes?.trim() || null,
          });

        if (error) throw error;
        toast.success("Practice manager added");
      }

      setIsDialogOpen(false);
      setEditingManager(null);
      fetchManagers();
    } catch (error) {
      console.error("Error saving practice manager:", error);
      toast.error("Failed to save practice manager");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await supabase
        .from("clinic_practice_managers")
        .update({ is_active: false })
        .eq("id", deleteConfirm.id);

      if (error) throw error;
      toast.success("Practice manager removed");
      setDeleteConfirm(null);
      fetchManagers();
    } catch (error) {
      console.error("Error deleting practice manager:", error);
      toast.error("Failed to remove practice manager");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Practice Managers
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : managers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No practice managers added yet</p>
          ) : (
            <div className="space-y-3">
              {managers.map((manager) => (
                <div
                  key={manager.id}
                  className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{manager.name}</div>
                    {manager.email && (
                      <button
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => copyToClipboard(manager.email!, "Email")}
                      >
                        <Mail className="h-3 w-3" />
                        {manager.email}
                      </button>
                    )}
                    {manager.phone && (
                      <button
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => copyToClipboard(manager.phone!, "Phone")}
                      >
                        <Phone className="h-3 w-3" />
                        {manager.phone}
                      </button>
                    )}
                    {manager.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{manager.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleEdit(manager)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(manager)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingManager?.id ? "Edit Practice Manager" : "Add Practice Manager"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pm-name">Name *</Label>
              <Input
                id="pm-name"
                value={editingManager?.name || ""}
                onChange={(e) =>
                  setEditingManager((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-email">Email</Label>
              <Input
                id="pm-email"
                type="email"
                value={editingManager?.email || ""}
                onChange={(e) =>
                  setEditingManager((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-phone">Phone</Label>
              <Input
                id="pm-phone"
                value={editingManager?.phone || ""}
                onChange={(e) =>
                  setEditingManager((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-notes">Notes</Label>
              <Textarea
                id="pm-notes"
                value={editingManager?.notes || ""}
                onChange={(e) =>
                  setEditingManager((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Optional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !editingManager?.name?.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Practice Manager</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteConfirm?.name} as a practice manager?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
