import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useRBACRole } from "@/hooks/useRBACRole";
import { CpdAttendanceLog } from "@/components/cpd/CpdAttendanceLog";
import { CpdMeetingsAdmin } from "@/components/cpd/CpdMeetingsAdmin";
import { CpdCategoriesAdmin } from "@/components/cpd/CpdCategoriesAdmin";
import { CpdUserSelector } from "@/components/cpd/CpdUserSelector";
import { CpdQuickGuide } from "@/components/cpd/CpdQuickGuide";
import ranzcrLogo from "@/assets/ranzcr-logo.png";

export default function CpdTracker() {
  const { user } = useAuth();
  const { isSuperAdmin, isTenantAdmin } = useRBACRole();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const canManageAll = isSuperAdmin || isTenantAdmin;
  const effectiveUserId = selectedUserId || user?.id || null;

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-6 flex items-start gap-4">
        <img src={ranzcrLogo} alt="RANZCR Logo" className="h-20 w-auto" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">CPD Tracker</h1>
          <p className="text-muted-foreground">
            Track your Continuing Professional Development meetings and activities
          </p>
        </div>
      </div>

      <CpdQuickGuide />

      {canManageAll && (
        <div className="mb-6">
          <CpdUserSelector
            selectedUserId={selectedUserId}
            onUserChange={setSelectedUserId}
          />
        </div>
      )}

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="attendance">My Attendance</TabsTrigger>
          {canManageAll && (
            <>
              <TabsTrigger value="meetings">Meetings</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="attendance">
          <CpdAttendanceLog userId={effectiveUserId} />
        </TabsContent>

        {canManageAll && (
          <>
            <TabsContent value="meetings">
              <CpdMeetingsAdmin />
            </TabsContent>
            <TabsContent value="categories">
              <CpdCategoriesAdmin />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
