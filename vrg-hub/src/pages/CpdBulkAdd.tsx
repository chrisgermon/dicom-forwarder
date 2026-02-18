import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CpdQuickGuide } from "@/components/cpd/CpdQuickGuide";
 
 export default function CpdBulkAdd() {
   const navigate = useNavigate();
   const { user } = useAuth();
   const { toast } = useToast();
   const [step, setStep] = useState(1);
   const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
   const [searchQuery, setSearchQuery] = useState("");
   const [isCustom, setIsCustom] = useState(false);
   const [submitting, setSubmitting] = useState(false);
 
   const [formData, setFormData] = useState({
     meetingId: "",
     customMeetingName: "",
     categoryId: "",
     attendanceDate: new Date().toISOString().split("T")[0],
     durationHours: "",
     cpdHoursClaimed: "",
     organisation: "",
     notes: "",
   });
 
   const { data: users } = useQuery({
     queryKey: ["profiles-list-bulk"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("profiles")
         .select("id, full_name, email")
         .order("full_name");
       if (error) throw error;
       return data || [];
     },
   });
 
   const { data: meetings } = useQuery({
     queryKey: ["cpd-meetings-active"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("cpd_meetings")
         .select("*")
         .eq("is_active", true)
         .order("name");
       if (error) throw error;
       return data || [];
     },
   });
 
   const { data: categories } = useQuery({
     queryKey: ["cpd-categories-active"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("cpd_categories")
         .select("*")
         .eq("is_active", true)
         .order("sort_order");
       if (error) throw error;
       return data || [];
     },
   });
 
   const handleMeetingChange = (meetingId: string) => {
     setFormData((prev) => ({ ...prev, meetingId }));
     const meeting = meetings?.find((m) => m.id === meetingId);
     if (meeting) {
       setFormData((prev) => ({
         ...prev,
         meetingId,
         categoryId: meeting.category_id || prev.categoryId,
         durationHours: meeting.default_duration_hours?.toString() || prev.durationHours,
         cpdHoursClaimed: meeting.default_duration_hours?.toString() || prev.cpdHoursClaimed,
       }));
     }
   };
 
   const toggleUser = (userId: string) => {
     setSelectedUserIds((prev) =>
       prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
     );
   };
 
   const filteredUsers = users?.filter(
     (u) =>
       !searchQuery.trim() ||
       u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       u.email?.toLowerCase().includes(searchQuery.toLowerCase())
   ) || [];
 
   const selectAllFiltered = () => {
     const idsToAdd = filteredUsers.map((u) => u.id);
     setSelectedUserIds((prev) => [...new Set([...prev, ...idsToAdd])]);
   };
 
   const handleSubmit = async () => {
     if (selectedUserIds.length === 0) {
       toast({
         title: "Error",
         description: "Please select at least one user",
         variant: "destructive",
       });
       return;
     }
 
     setSubmitting(true);
 
     try {
       const records = selectedUserIds.map((userId) => ({
         user_id: userId,
         meeting_id: isCustom ? null : formData.meetingId || null,
         custom_meeting_name: isCustom ? formData.customMeetingName : null,
         is_custom: isCustom,
         category_id: formData.categoryId || null,
         attendance_date: formData.attendanceDate,
         duration_hours: parseFloat(formData.durationHours) || 0,
         cpd_hours_claimed: parseFloat(formData.cpdHoursClaimed) || 0,
         organisation: formData.organisation || null,
         notes: formData.notes || null,
         created_by: user?.id,
       }));
 
       const { error } = await supabase.from("cpd_attendance").insert(records);
 
       if (error) throw error;
 
       toast({
         title: "Success",
         description: `Attendance logged for ${selectedUserIds.length} user(s)`,
       });
 
       navigate("/cpd-tracker");
     } catch (error) {
       console.error("Error logging attendance:", error);
       toast({
         title: "Error",
         description: "Failed to log attendance",
         variant: "destructive",
       });
     } finally {
       setSubmitting(false);
     }
   };
 
   const canProceedToStep2 = selectedUserIds.length > 0;
   const canProceedToStep3 = isCustom ? formData.customMeetingName.trim() : formData.meetingId;
   const canSubmit = canProceedToStep3 && formData.durationHours && formData.cpdHoursClaimed;
 
    return (
      <PageContainer maxWidth="lg">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/cpd-tracker")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to CPD Tracker
          </Button>
        </div>

        <CpdQuickGuide variant="compact" />
 
       <Card>
         <CardHeader>
           <CardTitle>Bulk Log CPD Attendance</CardTitle>
           <CardDescription>Step {step} of 3</CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
           {/* Step 1: Select Users */}
           {step === 1 && (
             <div className="space-y-4">
               <div>
                 <h3 className="text-lg font-semibold mb-2">Select Users</h3>
                 <p className="text-sm text-muted-foreground mb-4">
                   Choose which users to log attendance for ({selectedUserIds.length} selected)
                 </p>
               </div>
 
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder="Search users by name or email..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-9 pr-9"
                 />
                 {searchQuery && (
                   <button
                     type="button"
                     onClick={() => setSearchQuery("")}
                     className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                   >
                     <X className="h-4 w-4" />
                   </button>
                 )}
               </div>
 
               <div className="flex gap-2">
                 <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
                   {searchQuery ? "Add Filtered" : "Select All"}
                 </Button>
                 <Button type="button" variant="outline" size="sm" onClick={() => setSelectedUserIds([])}>
                   Clear Selection
                 </Button>
               </div>
 
               {selectedUserIds.length > 0 && (
                 <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-2 bg-muted/30 rounded-md">
                   {selectedUserIds.slice(0, 10).map((id) => {
                     const u = users?.find((u) => u.id === id);
                     return (
                       <span
                         key={id}
                         className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                       >
                         {u?.full_name || u?.email?.split("@")[0]}
                         <button type="button" onClick={() => toggleUser(id)}>
                           <X className="h-3 w-3" />
                         </button>
                       </span>
                     );
                   })}
                   {selectedUserIds.length > 10 && (
                     <span className="text-xs text-muted-foreground px-2 py-0.5">
                       +{selectedUserIds.length - 10} more
                     </span>
                   )}
                 </div>
               )}
 
               <ScrollArea className="h-96 border rounded-md">
                 <div className="p-2 space-y-1">
                   {filteredUsers.length === 0 ? (
                     <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
                   ) : (
                     filteredUsers.map((profile) => (
                       <div
                         key={profile.id}
                         className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                         onClick={() => toggleUser(profile.id)}
                       >
                         <Checkbox checked={selectedUserIds.includes(profile.id)} />
                         <div className="flex-1">
                           <div className="font-medium text-sm">{profile.full_name || "No name"}</div>
                           {profile.email && (
                             <div className="text-xs text-muted-foreground">{profile.email}</div>
                           )}
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               </ScrollArea>
 
               <div className="flex justify-end">
                 <Button onClick={() => setStep(2)} disabled={!canProceedToStep2}>
                   Next: Meeting Details
                   <ArrowRight className="h-4 w-4 ml-2" />
                 </Button>
               </div>
             </div>
           )}
 
           {/* Step 2: Meeting Details */}
           {step === 2 && (
             <div className="space-y-4">
               <div>
                 <h3 className="text-lg font-semibold mb-2">Meeting Details</h3>
                 <p className="text-sm text-muted-foreground mb-4">
                   Select a meeting or create a custom activity
                 </p>
               </div>
 
               <div className="flex items-center space-x-2">
                 <Switch id="custom-entry" checked={isCustom} onCheckedChange={setIsCustom} />
                 <Label htmlFor="custom-entry">Custom activity (not from meeting list)</Label>
               </div>
 
               {isCustom ? (
                 <div className="space-y-2">
                   <Label htmlFor="customMeetingName">Activity Name *</Label>
                   <Input
                     id="customMeetingName"
                     value={formData.customMeetingName}
                     onChange={(e) =>
                       setFormData((prev) => ({ ...prev, customMeetingName: e.target.value }))
                     }
                     placeholder="Enter activity name"
                   />
                 </div>
               ) : (
                 <div className="space-y-2">
                   <Label htmlFor="meeting">Meeting *</Label>
                   <Select value={formData.meetingId} onValueChange={handleMeetingChange}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select a meeting" />
                     </SelectTrigger>
                     <SelectContent>
                       {meetings?.map((meeting) => (
                         <SelectItem key={meeting.id} value={meeting.id}>
                           {meeting.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               )}
 
               <div className="space-y-2">
                 <Label htmlFor="category">CPD Category</Label>
                 <Select
                   value={formData.categoryId}
                   onValueChange={(value) => setFormData((prev) => ({ ...prev, categoryId: value }))}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select a category" />
                   </SelectTrigger>
                   <SelectContent>
                     {categories?.map((cat) => (
                       <SelectItem key={cat.id} value={cat.id}>
                         {cat.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
 
               <div className="flex gap-4">
                 <Button variant="outline" onClick={() => setStep(1)}>
                   <ArrowLeft className="h-4 w-4 mr-2" />
                   Back
                 </Button>
                 <Button onClick={() => setStep(3)} disabled={!canProceedToStep3} className="flex-1">
                   Next: Hours & Details
                   <ArrowRight className="h-4 w-4 ml-2" />
                 </Button>
               </div>
             </div>
           )}
 
           {/* Step 3: Hours and Additional Details */}
           {step === 3 && (
             <div className="space-y-4">
               <div>
                 <h3 className="text-lg font-semibold mb-2">Hours & Additional Details</h3>
                 <p className="text-sm text-muted-foreground mb-4">
                   Enter attendance hours and optional information
                 </p>
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="attendanceDate">Date *</Label>
                 <Input
                   id="attendanceDate"
                   type="date"
                   value={formData.attendanceDate}
                   onChange={(e) =>
                     setFormData((prev) => ({ ...prev, attendanceDate: e.target.value }))
                   }
                 />
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="durationHours">Duration (hrs) *</Label>
                   <Input
                     id="durationHours"
                     type="number"
                     step="0.5"
                     min="0"
                     value={formData.durationHours}
                     onChange={(e) =>
                       setFormData((prev) => ({ ...prev, durationHours: e.target.value }))
                     }
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="cpdHoursClaimed">CPD Hours *</Label>
                   <Input
                     id="cpdHoursClaimed"
                     type="number"
                     step="0.5"
                     min="0"
                     value={formData.cpdHoursClaimed}
                     onChange={(e) =>
                       setFormData((prev) => ({ ...prev, cpdHoursClaimed: e.target.value }))
                     }
                   />
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="organisation">Organisation</Label>
                 <Input
                   id="organisation"
                   value={formData.organisation}
                   onChange={(e) =>
                     setFormData((prev) => ({ ...prev, organisation: e.target.value }))
                   }
                   placeholder="e.g., RANZCR, Hospital"
                 />
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="notes">Notes</Label>
                 <Textarea
                   id="notes"
                   value={formData.notes}
                   onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                   placeholder="Additional notes..."
                   rows={3}
                 />
               </div>
 
               <div className="flex gap-4">
                 <Button variant="outline" onClick={() => setStep(2)}>
                   <ArrowLeft className="h-4 w-4 mr-2" />
                   Back
                 </Button>
                 <Button
                   onClick={handleSubmit}
                   disabled={!canSubmit || submitting}
                   className="flex-1"
                 >
                   {submitting ? (
                     "Saving..."
                   ) : (
                     <>
                       <Check className="h-4 w-4 mr-2" />
                       Save for {selectedUserIds.length} User(s)
                     </>
                   )}
                 </Button>
               </div>
             </div>
           )}
         </CardContent>
       </Card>
     </PageContainer>
   );
 }