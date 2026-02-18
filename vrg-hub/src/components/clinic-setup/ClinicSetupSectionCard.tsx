import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle2, User, Users } from "lucide-react";
import { ClinicSetupSection, ClinicSetupItem } from "@/hooks/useClinicSetupChecklists";
import { ClinicSetupFormField } from "./ClinicSetupFormField";
import { StaffAssignmentSelect } from "./StaffAssignmentSelect";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClinicSetupSectionCardProps {
  section: ClinicSetupSection;
  filteredItems: ClinicSetupItem[];
  onUpdateItem: (item: ClinicSetupItem, updates: Partial<ClinicSetupItem>) => Promise<void>;
  onUpdateSectionOwner?: (sectionId: string, ownerId: string | null) => Promise<void>;
  defaultOpen?: boolean;
  onMarkAllComplete?: () => void;
  isAdmin?: boolean;
}

export function ClinicSetupSectionCard({
  section,
  filteredItems,
  onUpdateItem,
  onUpdateSectionOwner,
  defaultOpen = false,
  onMarkAllComplete,
  isAdmin,
}: ClinicSetupSectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const [isAssigning, setIsAssigning] = useState(false);
  
  const totalItems = section.items?.length || 0;
  const completedItems = section.items?.filter(i => i.is_completed).length || 0;
  const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const isComplete = percent === 100 && totalItems > 0;

  // Assign all items in section to a staff member
  const handleAssignSectionToStaff = async (userId: string | null) => {
    setIsAssigning(true);
    try {
      const items = section.items || [];
      for (const item of items) {
        await onUpdateItem(item, { assigned_to: userId } as any);
      }
      toast.success(userId ? `Assigned ${items.length} items` : `Unassigned ${items.length} items`);
    } catch (error) {
      toast.error("Failed to assign items");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      isComplete && "border-green-200 bg-green-50/50 dark:bg-green-950/10"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-1 rounded hover:bg-muted/80">
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{section.section_name}</h3>
                    {isAdmin && onUpdateSectionOwner ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground">Owner:</span>
                        <StaffAssignmentSelect
                          value={section.section_owner_id}
                          onChange={(userId) => onUpdateSectionOwner(section.id, userId)}
                          placeholder="Set owner..."
                          size="sm"
                        />
                      </div>
                    ) : section.owner_profile?.full_name || section.section_owner ? (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <User className="h-3 w-3" />
                        {section.owner_profile?.full_name || section.section_owner}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Progress value={percent} className="w-24 h-2" />
                    <span className="text-sm text-muted-foreground">
                      {completedItems}/{totalItems}
                    </span>
                    {isComplete && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {filteredItems.length !== totalItems && (
                  <Badge variant="secondary" className="text-xs">
                    Showing {filteredItems.length} of {totalItems}
                  </Badge>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Assign all:
                    </span>
                    <StaffAssignmentSelect
                      onChange={handleAssignSectionToStaff}
                      disabled={isAssigning}
                      placeholder="Select..."
                    />
                  </div>
                )}
                {!isComplete && isAdmin && onMarkAllComplete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAllComplete();
                    }}
                    className="text-xs"
                  >
                    Mark All Done
                  </Button>
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredItems.map((item) => (
                  <ClinicSetupFormField
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => onUpdateItem(item, updates)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No items match your filters
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
