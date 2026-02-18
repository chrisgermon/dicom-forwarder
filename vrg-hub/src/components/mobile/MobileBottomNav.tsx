import { useLocation, useNavigate } from "react-router-dom";
import { Home, Ticket, Bell, Search, User, Plus, CheckCircle2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
}

export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const { data: notificationCount } = useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  if (!isMobile) return null;

  const navItems: NavItem[] = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: Ticket, label: "Requests", path: "/requests" },
    { icon: CheckCircle2, label: "Checklist", path: "/checklists/daily" },
    { icon: Bell, label: "Alerts", path: "/notifications", badge: notificationCount },
  ];

  const quickActions = [
    { label: "New IT Ticket", path: "/requests/tickets/new", icon: Ticket },
    { label: "New Request", path: "/requests/new", icon: Plus },
    { label: "Submit Incident", path: "/incident-form", icon: Bell },
    { label: "HR Assistance", path: "/hr-assistance", icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                  {item.badge && item.badge > 0 && (
                    <Badge
                      className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                      variant="destructive"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
                )}
              </button>
            );
          })}

          {/* Center FAB - Quick Actions */}
          <Drawer open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
            <DrawerTrigger asChild>
              <button className="flex flex-col items-center justify-center flex-1 h-full -mt-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                  <Plus className="h-6 w-6 text-primary-foreground" />
                </div>
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Quick Actions</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 pb-8 grid grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.path}
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => {
                        navigate(action.path);
                        setQuickActionsOpen(false);
                      }}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>

          {navItems.slice(2).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                  {item.badge && item.badge > 0 && (
                    <Badge
                      className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                      variant="destructive"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
                )}
              </button>
            );
          })}

          {/* Search Button */}
          <Drawer open={searchOpen} onOpenChange={setSearchOpen}>
            <DrawerTrigger asChild>
              <button className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground">
                <Search className="h-5 w-5" />
                <span className="text-[10px] mt-1 font-medium">Search</span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="h-[80vh]">
              <DrawerHeader>
                <DrawerTitle>Search</DrawerTitle>
              </DrawerHeader>
              <div className="p-4">
                <GlobalSearch />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-16" />
    </>
  );
}
