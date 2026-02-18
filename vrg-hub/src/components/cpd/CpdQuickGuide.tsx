import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, ChevronUp, ChevronDown, BookOpen, Users, FileDown, Mail, Plus } from "lucide-react";

interface CpdQuickGuideProps {
  variant?: "full" | "compact";
}

export function CpdQuickGuide({ variant = "full" }: CpdQuickGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <Card className="border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                CPD Tracker Quick Guide
              </span>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {variant === "full" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300 mb-2">
                    <Plus className="h-4 w-4" />
                    Logging Attendance
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Click "Log Attendance" to add entries</li>
                    <li>• Select a predefined meeting or custom activity</li>
                    <li>• Enter date, duration, and CPD hours</li>
                    <li>• Add organisation and notes if needed</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 font-semibold text-purple-700 dark:text-purple-300 mb-2">
                    <BookOpen className="h-4 w-4" />
                    CPD Categories
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Reviewing Performance</li>
                    <li>• Measuring Outcomes</li>
                    <li>• Educational Activities</li>
                    <li>• Categories align with RANZCR requirements</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-300 mb-2">
                    <FileDown className="h-4 w-4" />
                    Export & Email
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Export PDF for official records</li>
                    <li>• Email records with date range filter</li>
                    <li>• PDF matches RANZCR logbook format</li>
                    <li>• Select custom date ranges for reports</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 font-semibold text-orange-700 dark:text-orange-300 mb-2">
                    <Users className="h-4 w-4" />
                    Admin Features
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Bulk add attendance for groups</li>
                    <li>• View all records across users</li>
                    <li>• Manage meeting templates</li>
                    <li>• Configure CPD categories</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300 mb-2">
                    <BookOpen className="h-4 w-4" />
                    About CPD Tracker
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Track continuing professional development</li>
                    <li>• Log meetings and educational activities</li>
                    <li>• Categories align with RANZCR requirements</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-300 mb-2">
                    <Mail className="h-4 w-4" />
                    Export Options
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Export PDF matching official logbook format</li>
                    <li>• Email records with custom date ranges</li>
                    <li>• Filter by date for specific periods</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
