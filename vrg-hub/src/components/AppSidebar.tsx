import { 
  Ticket,
  Clock,
  Users, 
  Settings, 
  BarChart3,
  Network,
  ScrollText,
  HelpCircle,
  Wrench,
  ChevronDown,
  Search,
  FolderOpen,
  Home,
  Newspaper,
  LifeBuoy,
  Plus,
  Bell,
  Edit,
  Plug,
  Mail,
  Calendar,
  HeartHandshake,
  CheckCircle2,
  Building2,
  Printer,
  UserCog,
  ClipboardList,
  Briefcase,
  Contact,
  MessageSquare,
  ListTodo,
  TrendingUp,
  Target
} from "lucide-react";
import * as Icons from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";
// GlobalRequestsIcon reserved for future use
// import GlobalRequestsIcon from "@/assets/global-requests-icon.svg";
import foxoLogo from "@/assets/foxo-logo.png";
import optiqLogo from "@/assets/optiq-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFeatures } from "@/hooks/useCompanyFeatures";
import { usePermissions } from "@/hooks/usePermissions";
import { MenuItemEditor } from "@/components/MenuItemEditor";
import { useToast } from "@/hooks/use-toast";
// CompanySelector reserved for multi-tenant mode
// import { CompanySelector } from "@/components/CompanySelector";
import { useRoleImpersonation } from "@/hooks/useRoleImpersonation";
import { GlobalSearch } from "@/components/GlobalSearch";

interface AppSidebarProps {
  userRole: "requester" | "manager" | "marketing_manager" | "tenant_admin" | "super_admin" | "marketing" | null;
}

export function AppSidebar({ userRole: propUserRole }: AppSidebarProps) {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  
  // Close sidebar on mobile when menu item is clicked
  const handleMenuItemClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const _location = useLocation(); void _location;
  const { user } = useAuth(); void user;
  // userCompany reserved for multi-tenant mode
  const { effectiveRole: impersonatedRole } = useRoleImpersonation();
  
  // Use impersonated role if active, otherwise use the prop role
  const userRole = (impersonatedRole || propUserRole) as "requester" | "manager" | "marketing_manager" | "tenant_admin" | "super_admin" | "marketing" | null;
  const { isFeatureEnabled } = useCompanyFeatures();
  const { hasPermission } = usePermissions();
  const [hasNewsletterAssignment, setHasNewsletterAssignment] = useState(false);
  const [checkingAssignment, setCheckingAssignment] = useState(true);
  const [editingItem, setEditingItem] = useState<{ key: string; label: string; icon?: string } | null>(null);
  const [menuCustomizations, setMenuCustomizations] = useState<Record<string, { label?: string; icon?: string; visible?: boolean }>>({});
  const [, setMenuConfigs] = useState<unknown[]>([]);
  const [globalHeadings, setGlobalHeadings] = useState<any[]>([]);
  const { toast } = useToast();

  // Load menu customizations with real-time updates
  useEffect(() => {
    const loadMenuCustomizations = async () => {
      if (!userRole) return;

      try {
        const { data, error } = await (supabase as any)
          .from('menu_configurations')
          .select('item_key, custom_label, custom_icon, is_visible, item_type, sort_order, custom_heading_label')
          .eq('role', userRole)
          .order('sort_order');

        if (!error && data) {
          setMenuConfigs(data || []);
          const customizations: Record<string, { label?: string; icon?: string; visible?: boolean }> = {};
          data.forEach((item) => {
            customizations[item.item_key] = {
              label: item.custom_label || undefined,
              icon: item.custom_icon || undefined,
              visible: item.is_visible,
            };
          });
          setMenuCustomizations(customizations);
        }
      } catch (error) {
        logger.error('Error loading menu customizations', error);
      }
    };

    const loadGlobalHeadings = async () => {
      try {
        const { data, error } = await supabase
          .from('menu_headings')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        if (!error && data) {
          setGlobalHeadings(data || []);
        }
      } catch (error) {
        logger.error('Error loading global headings', error);
      }
    };

    loadMenuCustomizations();
    loadGlobalHeadings();

    // Set up real-time subscription for menu configuration changes
    const channel = supabase
      .channel(`menu-configs-${userRole}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_configurations',
          filter: `role=eq.${userRole}`,
        },
        (payload) => {
          logger.debug('Menu config changed', payload);
          // Reload customizations when changes occur
          loadMenuCustomizations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_headings',
        },
        (payload) => {
          logger.debug('Menu headings changed', payload);
          // Reload headings when changes occur
          loadGlobalHeadings();
        }
      )
      .subscribe((status) => {
        logger.debug('Menu subscription status', { status });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  // Also refresh menu when returning to the app (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRole) {
        // Reload menu data when user returns to the tab
        const loadData = async () => {
          try {
            const [configData, headingsData] = await Promise.all([
              (supabase as any)
                .from('menu_configurations')
                .select('item_key, custom_label, custom_icon, is_visible, item_type, sort_order, custom_heading_label')
                .eq('role', userRole)
                .order('sort_order'),
              supabase
                .from('menu_headings')
                .select('*')
                .eq('is_active', true)
                .order('sort_order')
            ]);

            if (!configData.error && configData.data) {
              setMenuConfigs(configData.data || []);
              const customizations: Record<string, { label?: string; icon?: string; visible?: boolean }> = {};
              configData.data.forEach((item) => {
                customizations[item.item_key] = {
                  label: item.custom_label || undefined,
                  icon: item.custom_icon || undefined,
                  visible: item.is_visible,
                };
              });
              setMenuCustomizations(customizations);
            }

            if (!headingsData.error && headingsData.data) {
              setGlobalHeadings(headingsData.data || []);
            }
          } catch (error) {
            logger.error('Error refreshing menu data', error);
          }
        };

        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userRole]);

  // Check if user has newsletter assignment - MUST be before any conditional returns
  useEffect(() => {
    const checkNewsletterAssignment = async () => {
      if (!user?.id) {
        setCheckingAssignment(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from('department_assignments')
          .select('department')
          .contains('assignee_ids', [user.id]);

        if (!error && data && data.length > 0) {
          setHasNewsletterAssignment(true);
        }
      } catch (error) {
        logger.error('Error checking newsletter assignment', error);
      } finally {
        setCheckingAssignment(false);
      }
    };

    checkNewsletterAssignment();
  }, [user?.id]);

  // Guard against null/undefined userRole - MUST be after all hooks
  if (!userRole) {
    return null;
  }

  // Super admin doesn't get special menu treatment anymore
  // They should only see platform admin interface
  const effectiveRole = impersonatedRole || userRole;

  // isPathActive helper removed - not currently used

  // Only allow menu editing based on actual role, not impersonated role
  const canEditMenu = propUserRole === 'super_admin' || propUserRole === 'tenant_admin';

  const getMenuItemKey = (title: string, url: string): string => {
    // Create a consistent key from title and url
    const titleKey = title.toLowerCase().replace(/\s+/g, '-');
    return `${titleKey}-${url.split('/').filter(Boolean).join('-')}`;
  };

  const getCustomLabel = (itemKey: string, defaultLabel: string): string => {
    return menuCustomizations[itemKey]?.label || defaultLabel;
  };

  const getCustomIcon = (itemKey: string, defaultIcon: any): any => {
    const customIconName = menuCustomizations[itemKey]?.icon;
    if (customIconName && (Icons as any)[customIconName]) {
      return (Icons as any)[customIconName];
    }
    return defaultIcon;
  };

  const isMenuItemVisible = (itemKey: string): boolean => {
    // If no config exists for this item, it's visible by default
    if (!(itemKey in menuCustomizations)) return true;
    // Otherwise, check the is_visible flag
    return menuCustomizations[itemKey]?.visible !== false;
  };

  // Meta-style menu - clean with bold highlight for active state
  const getMenuItemClasses = (isActive: boolean): string => {
    const baseClasses = 'flex items-center gap-3 px-3 py-2 mx-2 rounded-lg transition-colors duration-100';
    if (isActive) {
      return `${baseClasses} bg-primary text-primary-foreground font-semibold shadow-sm`;
    }
    return `${baseClasses} text-sidebar-foreground hover:bg-muted/60 font-normal`;
  };

  const handleEditMenuItem = (itemKey: string, label: string, icon?: string) => {
    setEditingItem({ key: itemKey, label, icon });
  };

  const handleSaveMenuItem = async (label: string, icon: string) => {
    if (!editingItem || !userRole) return;

    try {
      // Get all existing configs for this item across all roles
      const { data: existingConfigs, error: fetchError } = await (supabase as any)
        .from('menu_configurations')
        .select('id, role')
        .eq('item_key', editingItem.key);

      if (fetchError) throw fetchError;

      const allRoles: Array<'requester' | 'manager' | 'marketing_manager' | 'tenant_admin' | 'super_admin' | 'marketing'> = 
        ['requester', 'manager', 'marketing_manager', 'tenant_admin', 'super_admin', 'marketing'];

      // Update or insert for all roles
      const updatePromises = allRoles.map(async (role) => {
        const existingConfig = existingConfigs?.find(c => c.role === role);

        if (existingConfig) {
          // Update existing
          return (supabase as any)
            .from('menu_configurations')
            .update({ custom_label: label, custom_icon: icon })
            .eq('id', existingConfig.id);
        } else {
          // Insert new
          return (supabase as any)
            .from('menu_configurations')
            .insert({
              role: role,
              item_key: editingItem.key,
              item_type: 'item',
              custom_label: label,
              custom_icon: icon,
              is_visible: true,
              sort_order: 0,
            });
        }
      });

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} role(s)`);
      }

      toast({
        title: 'Success',
        description: 'Menu item updated for all user roles',
      });

      setEditingItem(null);
    } catch (error) {
      logger.error('Error saving menu item', error);
      toast({
        title: 'Error',
        description: 'Failed to update menu item',
        variant: 'destructive',
      });
    }
  };

  const getMenuCategories = () => {
    const commonItems = [
      { title: "Home", url: "/home", icon: Home },
      { title: "Requests", url: "/requests", icon: Ticket },
      { title: "Reminders", url: "/reminders", icon: Bell },
    ].filter(item => isMenuItemVisible(getMenuItemKey(item.title, item.url)));
    
    // Checklist menu configuration - visible for all, sub-items restricted by role
    const checklistConfig = {
      title: "Checklist",
      url: "/checklists/daily",
      icon: CheckCircle2,
      subItems: [
        { title: "Daily Checklist", url: "/checklists/daily", icon: CheckCircle2 },
        // Reports and Templates only visible for admins
        ...(['tenant_admin', 'super_admin'].includes(effectiveRole) ? [
          { title: "Checklist Reports", url: "/admin/checklist-reports", icon: BarChart3 },
          { title: "Checklist Templates", url: "/admin/checklist-templates", icon: ScrollText },
        ] : []),
      ]
    };

    const helpItem = { title: "Help Guide", url: "/help", icon: HelpCircle, key: "help" };
    const helpTicketItem = { title: "Submit IT Ticket", url: "/help-ticket", icon: LifeBuoy, key: "help-ticket" };
    const canSubmitTicket = hasPermission('create_ticket_request');
    const directoryItem = { title: "Company Directory", url: "/directory", icon: Users, key: "directory" };

    // Helper to check if newsletter should be visible
    const isNewsletterVisible = () => {
      // Always visible for managers and admins
      const isManager = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(effectiveRole);
      if (isManager) return true;
      
      // Visible for users with assignments
      return hasNewsletterAssignment && !checkingAssignment;
    };

    // Helper to filter items by feature availability AND permissions
    const filterByFeatures = (items: any[]) => {
      return items.filter(item => {
        // Map URLs to feature keys and permission keys
        if (item.url?.includes('/requests/tickets/new')) {
          return hasPermission('create_ticket_request');
        }
        if (item.url?.includes('/facility-services')) {
          return hasPermission('create_facility_services_request');
        }
        if (item.url?.includes('/office-services')) {
          return hasPermission('create_office_services_request');
        }
        if (item.url?.includes('/accounts-payable')) {
          return hasPermission('create_accounts_payable_request');
        }
        if (item.url?.includes('/finance/new')) {
          return hasPermission('create_finance_request');
        }
        if (item.url?.includes('/technology-training')) {
          return hasPermission('create_technology_training_request');
        }
        if (item.url?.includes('/it-service-desk')) {
          return hasPermission('create_it_service_desk_request');
        }
        if (item.url?.includes('/hr/new')) {
          return hasPermission('create_hr_request');
        }
        if (item.url?.includes('/requests') && !item.url?.includes('/marketing')) {
          return isFeatureEnabled('hardware_requests') && hasPermission('create_hardware_request');
        }
        if (item.url?.includes('/toner')) {
          return isFeatureEnabled('toner_requests') && hasPermission('create_toner_request');
        }
        if (item.url?.includes('/user-accounts/new')) {
          return isFeatureEnabled('user_accounts') && hasPermission('create_user_account_request');
        }
        if (item.url?.includes('/user-offboarding/new')) {
          return isFeatureEnabled('user_accounts') && hasPermission('create_user_offboarding_request');
        }
        if (item.url?.includes('/marketing')) {
          return isFeatureEnabled('marketing_requests') && hasPermission('create_marketing_request');
        }
        if (item.url?.includes('/newsletter')) {
          return isFeatureEnabled('monthly_newsletter') && isNewsletterVisible();
        }
        if (item.url?.includes('/modality-management')) {
          return isFeatureEnabled('modality_management') && hasPermission('view_modality_details');
        }
        if (item.url?.includes('/documents')) {
          return true; // All authenticated users can access file manager
        }
        if (item.url?.includes('/hr-assistance')) {
          return true; // All authenticated users can access HR & Employee Assistance
        }
        if (item.url?.includes('/print-orders')) {
          return isFeatureEnabled('print_ordering');
        }
        // Keep items without feature mapping
        return true;
      });
    };

    // Single news menu item
    const newsMenuItem = { title: "News", url: "/news/view-all", icon: Newspaper };

    switch (effectiveRole) {
      case "requester":
      case "marketing":
        return {
          common: commonItems,
          checklist: checklistConfig,
          news: newsMenuItem,
          categories: [
          ].filter(cat => cat.items.length > 0), // Remove empty categories
          crm: {
            title: "CRM",
            icon: Briefcase,
            items: [
              { title: "Dashboard", url: "/mlo-dashboard", icon: TrendingUp },
              { title: "Contacts", url: "/mlo-contacts", icon: Contact },
              { title: "Communications", url: "/mlo-communications", icon: MessageSquare },
              { title: "Tasks", url: "/mlo-tasks", icon: ListTodo },
              { title: "Pipeline", url: "/mlo-pipeline", icon: TrendingUp },
              ...(hasPermission('view_fax_campaigns') && isFeatureEnabled('fax_campaigns')
                ? [
                    { title: "Marketing Campaigns", url: "/marketing-campaigns", icon: Mail },
                    { title: "Marketing Calendar", url: "/marketing-calendar", icon: Calendar }
                  ]
                : []),
            ]
          },
          documents: { title: "File Directory", url: "/company-documents", icon: FolderOpen, key: "documents-documents" },
          printOrders: isFeatureEnabled('print_ordering') ? { title: "Print Order Forms", url: "/print-orders", icon: Printer, key: "print-orders" } : null,
          rosters: { title: "Rosters", url: "/rosters", icon: ClipboardList },
          cpdTracker: { title: "CPD Tracker", url: "/cpd-tracker", icon: ScrollText },
          hrAssistance: { title: "HR & Employee Assistance", url: "/hr-assistance", icon: HeartHandshake },
          modalityDetails: isFeatureEnabled('modality_management') && hasPermission('view_modality_details')
            ? { title: "Modality Details", url: "/modality-management", icon: Network }
            : null,
          admin: [],
          newsletter: isFeatureEnabled('monthly_newsletter') && isNewsletterVisible() 
            ? { title: "Monthly Newsletter", url: "/newsletter", icon: Newspaper } 
            : null,
          directory: isMenuItemVisible(directoryItem.key) ? directoryItem : null,
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };
      
      case "manager":
        return {
          common: commonItems,
          checklist: checklistConfig,
          approvals: { title: "Pending Approvals", url: "/approvals", icon: Clock },
          news: newsMenuItem,
          categories: [
          ].filter(cat => cat.items.length > 0),
          documents: { title: "File Directory", url: "/company-documents", icon: FolderOpen, key: "documents-documents" },
          printOrders: isFeatureEnabled('print_ordering') ? { title: "Print Order Forms", url: "/print-orders", icon: Printer, key: "print-orders" } : null,
          rosters: { title: "Rosters", url: "/rosters", icon: ClipboardList },
          hrAssistance: { title: "HR & Employee Assistance", url: "/hr-assistance", icon: HeartHandshake },
          modalityDetails: isFeatureEnabled('modality_management') && hasPermission('view_modality_details')
            ? { title: "Modality Details", url: "/modality-management", icon: Network }
            : null,
          crm: {
            title: "CRM",
            icon: Briefcase,
            items: [
              { title: "Dashboard", url: "/mlo-dashboard", icon: TrendingUp },
              { title: "Contacts", url: "/mlo-contacts", icon: Contact },
              { title: "Communications", url: "/mlo-communications", icon: MessageSquare },
              { title: "Tasks", url: "/mlo-tasks", icon: ListTodo },
              { title: "Pipeline", url: "/mlo-pipeline", icon: TrendingUp },
              { title: "Targets & Worksites", url: "/mlo-targets", icon: Target },
              ...(hasPermission('view_fax_campaigns') && isFeatureEnabled('fax_campaigns')
                ? [
                    { title: "Marketing Campaigns", url: "/marketing-campaigns", icon: Mail },
                    { title: "Marketing Calendar", url: "/marketing-calendar", icon: Calendar }
                  ]
                : []),
            ]
          },
          admin: [],
          newsletter: isFeatureEnabled('monthly_newsletter') && isNewsletterVisible() 
            ? { title: "Monthly Newsletter", url: "/newsletter", icon: Newspaper } 
            : null,
          directory: isMenuItemVisible(directoryItem.key) ? directoryItem : null,
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };

      case "marketing_manager":
        return {
          common: commonItems,
          checklist: checklistConfig,
          approvals: { title: "Pending Approvals", url: "/approvals", icon: Clock },
          news: newsMenuItem,
          categories: [
          ].filter(cat => cat.items.length > 0),
          documents: { title: "File Directory", url: "/company-documents", icon: FolderOpen, key: "documents-documents" },
          printOrders: isFeatureEnabled('print_ordering') ? { title: "Print Order Forms", url: "/print-orders", icon: Printer, key: "print-orders" } : null,
          rosters: { title: "Rosters", url: "/rosters", icon: ClipboardList },
          hrAssistance: { title: "HR & Employee Assistance", url: "/hr-assistance", icon: HeartHandshake },
          modalityDetails: isFeatureEnabled('modality_management') && hasPermission('view_modality_details')
            ? { title: "Modality Details", url: "/modality-management", icon: Network }
            : null,
          crm: {
            title: "CRM",
            icon: Briefcase,
            items: [
              { title: "Dashboard", url: "/mlo-dashboard", icon: TrendingUp },
              { title: "Performance", url: "/mlo-performance", icon: BarChart3 },
              { title: "Contacts", url: "/mlo-contacts", icon: Contact },
              { title: "Communications", url: "/mlo-communications", icon: MessageSquare },
              { title: "Tasks", url: "/mlo-tasks", icon: ListTodo },
              { title: "Pipeline", url: "/mlo-pipeline", icon: TrendingUp },
              { title: "Targets & Worksites", url: "/mlo-targets", icon: Target },
              ...(hasPermission('view_fax_campaigns') && isFeatureEnabled('fax_campaigns')
                ? [
                    { title: "Marketing Campaigns", url: "/marketing-campaigns", icon: Mail },
                    { title: "Marketing Calendar", url: "/marketing-calendar", icon: Calendar }
                  ]
                : []),
            ]
          },
          admin: [],
          newsletter: isFeatureEnabled('monthly_newsletter') && isNewsletterVisible() 
            ? { title: "Monthly Newsletter", url: "/newsletter", icon: Newspaper } 
            : null,
          directory: isMenuItemVisible(directoryItem.key) ? directoryItem : null,
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };
      
      case "tenant_admin":
        return {
          common: commonItems,
          checklist: checklistConfig,
          approvals: { title: "Pending Approvals", url: "/approvals", icon: Clock },
          news: newsMenuItem,
          categories: [
            {
              title: "Equipment",
              icon: Wrench,
              items: filterByFeatures([]),
              paths: ["/requests", "/toner"]
            },
          ].filter(cat => cat.items.length > 0),
          documents: { title: "File Directory", url: "/company-documents", icon: FolderOpen, key: "documents-documents" },
          printOrders: isFeatureEnabled('print_ordering') ? { title: "Print Order Forms", url: "/print-orders", icon: Printer, key: "print-orders" } : null,
          rosters: { title: "Rosters", url: "/rosters", icon: ClipboardList },
          hrAssistance: { title: "HR & Employee Assistance", url: "/hr-assistance", icon: HeartHandshake },
          modalityDetails: isFeatureEnabled('modality_management') && hasPermission('view_modality_details')
            ? { title: "Modality Details", url: "/modality-management", icon: Network }
            : null,
          crm: {
            title: "CRM",
            icon: Briefcase,
            items: [
              { title: "Dashboard", url: "/mlo-dashboard", icon: TrendingUp },
              { title: "Contacts", url: "/mlo-contacts", icon: Contact },
              { title: "Communications", url: "/mlo-communications", icon: MessageSquare },
              { title: "Tasks", url: "/mlo-tasks", icon: ListTodo },
              { title: "Pipeline", url: "/mlo-pipeline", icon: TrendingUp },
              ...(hasPermission('view_fax_campaigns') && isFeatureEnabled('fax_campaigns')
                ? [
                    { title: "Marketing Campaigns", url: "/marketing-campaigns", icon: Mail },
                    { title: "Marketing Calendar", url: "/marketing-calendar", icon: Calendar }
                  ]
                : []),
            ]
          },
          admin: [
            { title: "Clinic Setup", url: "/clinic-setup", icon: Building2 },
          ],
          newsletter: isFeatureEnabled('monthly_newsletter') && isNewsletterVisible() 
            ? { title: "Monthly Newsletter", url: "/newsletter", icon: Newspaper } 
            : null,
          directory: isMenuItemVisible(directoryItem.key) ? directoryItem : null,
          settings: { title: "Settings", url: "/settings", icon: Settings },
          userManagement: { title: "User Management", url: "/user-roles", icon: UserCog },
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };
      
      case "super_admin":
        return {
          common: commonItems,
          checklist: checklistConfig,
          approvals: { title: "Pending Approvals", url: "/approvals", icon: Clock },
          news: newsMenuItem,
          categories: [
            {
              title: "Equipment",
              icon: Wrench,
              items: filterByFeatures([]),
              paths: ["/approvals", "/requests", "/toner"]
            },
          ].filter(cat => cat.items.length > 0),
          documents: { title: "File Directory", url: "/company-documents", icon: FolderOpen, key: "documents-documents" },
          printOrders: isFeatureEnabled('print_ordering') ? { title: "Print Order Forms", url: "/print-orders", icon: Printer, key: "print-orders" } : null,
          rosters: { title: "Rosters", url: "/rosters", icon: ClipboardList },
          hrAssistance: { title: "HR & Employee Assistance", url: "/hr-assistance", icon: HeartHandshake },
          modalityDetails: isFeatureEnabled('modality_management') && hasPermission('view_modality_details')
            ? { title: "Modality Details", url: "/modality-management", icon: Network }
            : null,
          admin: [
            { title: "Clinic Setup", url: "/clinic-setup", icon: Building2 },
            { title: "Radiology Search", url: "/radiology-search", icon: Search },
            { title: "Audit Log", url: "/audit-log", icon: ScrollText },
            { title: "Integrations", url: "/integrations", icon: Plug },
            { title: "Analytics AI", url: "/analytics-ai", icon: BarChart3 },
          ],
          crm: {
            title: "CRM",
            icon: Briefcase,
            items: [
              { title: "Dashboard", url: "/mlo-dashboard", icon: TrendingUp },
              { title: "Performance", url: "/mlo-performance", icon: BarChart3 },
              { title: "Contacts", url: "/mlo-contacts", icon: Contact },
              { title: "Communications", url: "/mlo-communications", icon: MessageSquare },
              { title: "Tasks", url: "/mlo-tasks", icon: ListTodo },
              { title: "Pipeline", url: "/mlo-pipeline", icon: TrendingUp },
              { title: "Targets & Worksites", url: "/mlo-targets", icon: Target },
              { title: "Marketing Campaigns", url: "/marketing-campaigns", icon: Mail },
              { title: "Marketing Calendar", url: "/marketing-calendar", icon: Calendar },
            ]
          },
          newsletter: isFeatureEnabled('monthly_newsletter') && isNewsletterVisible() 
            ? { title: "Monthly Newsletter", url: "/newsletter", icon: Newspaper } 
            : null,
          directory: isMenuItemVisible(directoryItem.key) ? directoryItem : null,
          settings: { title: "Settings", url: "/settings", icon: Settings },
          userManagement: { title: "User Management", url: "/user-roles", icon: UserCog },
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };
      
        default:
        return {
          common: commonItems,
          checklist: checklistConfig,
          categories: [],
          documents: { title: "File Directory", url: "/company-documents", icon: FolderOpen, key: "documents-documents" },
          printOrders: isFeatureEnabled('print_ordering') ? { title: "Print Order Forms", url: "/print-orders", icon: Printer, key: "print-orders" } : null,
          rosters: { title: "Rosters", url: "/rosters", icon: ClipboardList },
          hrAssistance: { title: "HR & Employee Assistance", url: "/hr-assistance", icon: HeartHandshake },
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };
    }
  };

  const menuConfig = getMenuCategories();

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-72"} border-r border-sidebar-border`} collapsible="icon">
      <SidebarContent className="flex flex-col h-full overflow-x-hidden bg-sidebar-background">
        {/* Header with Search */}
        <div className={`${collapsed ? 'px-2 py-4' : 'px-4 py-5'} space-y-4`}>
          {/* Search - Clean modern style */}
          <GlobalSearch />
          
          {/* New Request Button - Prominent with accent color */}
          <Button 
            onClick={() => {
              window.location.href = '/requests/new';
              handleMenuItemClick();
            }}
            className={`w-full h-11 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 ${collapsed ? 'px-0' : ''}`}
          >
            <Plus className={collapsed ? "w-5 h-5" : "w-4 h-4 mr-2"} />
            {!collapsed && <span>New Request</span>}
          </Button>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarGroup>
            <SidebarGroupContent>
            <SidebarMenu className="space-y-1">

              {/* 1. Home - First priority item */}
              {menuConfig.common.filter(item => item.title === "Home").map((item) => {
                const itemKey = getMenuItemKey(item.title, item.url);
                const CustomIcon = getCustomIcon(itemKey, item.icon);
                const customLabel = getCustomLabel(itemKey, item.title);
                
                const menuItem = (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu key={item.title}>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })}

              {/* 2. Documents - Second priority */}
              {menuConfig.documents && (() => {
                const itemKey = (menuConfig.documents as any).key || getMenuItemKey(menuConfig.documents.title, menuConfig.documents.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.documents.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.documents.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.documents.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* 3. HR & Employee Assistance - Third priority */}
              {menuConfig.hrAssistance && (() => {
                const itemKey = getMenuItemKey(menuConfig.hrAssistance.title, menuConfig.hrAssistance.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.hrAssistance.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.hrAssistance.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.hrAssistance.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* Rosters */}
              {menuConfig.rosters && (() => {
                const itemKey = getMenuItemKey(menuConfig.rosters.title, menuConfig.rosters.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.rosters.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.rosters.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.rosters.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* Print Order Forms */}
              {menuConfig.printOrders && (() => {
                const itemKey = getMenuItemKey(menuConfig.printOrders.title, menuConfig.printOrders.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.printOrders.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.printOrders.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.printOrders.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* 4. News - Fourth priority */}
              {menuConfig.news && (() => {
                const itemKey = getMenuItemKey(menuConfig.news.title, menuConfig.news.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.news.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.news.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.news.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* 5. Requests - Fifth priority item (with optional sub-items) */}
              {menuConfig.common.filter(item => item.title === "Requests").map((item) => {
                const itemKey = getMenuItemKey(item.title, item.url);
                const CustomIcon = getCustomIcon(itemKey, item.icon);
                const customLabel = getCustomLabel(itemKey, item.title);
                
                // Check if Handler Groups should be visible
                const canManageHandlerGroups = userRole === 'super_admin' || hasPermission('manage_handler_groups');
                
                // If user can see sub-items, render as collapsible
                if (canManageHandlerGroups && !collapsed) {
                  return (
                    <Collapsible
                      key={item.title}
                      defaultOpen={false}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <div className="flex items-center">
                          <SidebarMenuButton asChild className="flex-1">
                            <NavLink 
                              to={item.url} 
                              onClick={handleMenuItemClick}
                              className={({ isActive }) => getMenuItemClasses(isActive)}
                            >
                              <CustomIcon className="w-5 h-5 flex-shrink-0" />
                              <span className="text-sm">{customLabel}</span>
                            </NavLink>
                          </SidebarMenuButton>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-2">
                              <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <SidebarMenu className="ml-4 border-l pl-2 mt-1">
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild>
                                <NavLink 
                                  to="/admin/handler-groups"
                                  onClick={handleMenuItemClick}
                                  className={({ isActive }) => getMenuItemClasses(isActive)}
                                >
                                  <Users className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-sm">Handler Groups</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </SidebarMenu>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                
                // Otherwise render as simple menu item
                const menuItem = (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu key={item.title}>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })}

              {/* Other Common Items (Reminders, etc.) */}
              {menuConfig.common.filter(item => item.title !== "Home" && item.title !== "Requests").map((item) => {
                const itemKey = getMenuItemKey(item.title, item.url);
                const CustomIcon = getCustomIcon(itemKey, item.icon);
                const customLabel = getCustomLabel(itemKey, item.title);
                
                const menuItem = (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu key={item.title}>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })}

              {/* Checklist Menu - Collapsible with sub-items for admins */}
              {menuConfig.checklist && (() => {
                const checklistData = menuConfig.checklist as { title: string; url: string; icon: any; subItems: { title: string; url: string; icon: any }[] };
                const itemKey = getMenuItemKey(checklistData.title, checklistData.url);
                const CustomIcon = getCustomIcon(itemKey, checklistData.icon);
                const customLabel = getCustomLabel(itemKey, checklistData.title);
                
                // If only one sub-item (Daily Checklist for non-admins), render as simple link
                if (checklistData.subItems.length === 1 || collapsed) {
                  const menuItem = (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={checklistData.url}
                          onClick={handleMenuItemClick}
                          className={({ isActive }) => getMenuItemClasses(isActive)}
                        >
                          <CustomIcon className="w-5 h-5 flex-shrink-0" />
                          {!collapsed && <span className="text-sm">{customLabel}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                  return menuItem;
                }
                
                // Render as collapsible for admins with sub-items
                return (
                  <Collapsible
                    defaultOpen={false}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <div className="flex items-center">
                        <SidebarMenuButton asChild className="flex-1">
                          <NavLink 
                            to={checklistData.url}
                            onClick={handleMenuItemClick}
                            className={({ isActive }) => getMenuItemClasses(isActive)}
                          >
                            <CustomIcon className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">{customLabel}</span>
                          </NavLink>
                        </SidebarMenuButton>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-2">
                            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <SidebarMenu className="ml-4 border-l pl-2 mt-1">
                          {checklistData.subItems.map((subItem) => (
                            <SidebarMenuItem key={subItem.title}>
                              <SidebarMenuButton asChild>
                                <NavLink 
                                  to={subItem.url}
                                  onClick={handleMenuItemClick}
                                  className={({ isActive }) => getMenuItemClasses(isActive)}
                                >
                                  <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-sm">{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })()}

              {/* CRM Collapsible Menu - Second after Checklist */}
              {menuConfig.crm && (
                <Collapsible
                  defaultOpen={location.pathname.startsWith('/mlo-')}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <div className="flex items-center">
                      <SidebarMenuButton asChild className="flex-1">
                        <NavLink 
                          to="/mlo-dashboard"
                          onClick={handleMenuItemClick}
                          className={({ isActive }) => getMenuItemClasses(isActive || location.pathname.startsWith('/mlo-'))}
                        >
                          <menuConfig.crm.icon className="w-5 h-5 flex-shrink-0" />
                          {!collapsed && <span className="text-sm">{menuConfig.crm.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-2">
                          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <SidebarMenu className="ml-4 border-l pl-2 mt-1">
                        {menuConfig.crm.items.map((item) => {
                          const itemKey = getMenuItemKey(item.title, item.url);
                          const CustomIcon = getCustomIcon(itemKey, item.icon);
                          const customLabel = getCustomLabel(itemKey, item.title);
                          
                          const menuItem = (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton asChild>
                                <NavLink 
                                  to={item.url}
                                  onClick={handleMenuItemClick}
                                  className={({ isActive }) => getMenuItemClasses(isActive)}
                                >
                                  <CustomIcon className="w-4 h-4 flex-shrink-0" />
                                  {!collapsed && <span className="text-sm">{customLabel}</span>}
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );

                          return canEditMenu ? (
                            <ContextMenu key={item.title}>
                              <ContextMenuTrigger>
                                {menuItem}
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Menu Item
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          ) : menuItem;
                        })}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Render global headings from menu_headings table */}
              {globalHeadings.map((heading) => (
                <SidebarGroupLabel key={heading.id} className="px-4 py-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {!collapsed && heading.label}
                </SidebarGroupLabel>
              ))}

              {/* Categorized Items - flatten single-item categories */}
              {menuConfig.categories.map((category) => {
                // If category has only one item, render it as a standalone menu item
                if (category.items.length === 1) {
                  const item = category.items[0];
                  const itemKey = getMenuItemKey(item.title, item.url);
                  const CustomIcon = getCustomIcon(itemKey, item.icon);
                  const customLabel = getCustomLabel(itemKey, item.title);
                  
                  const menuItem = (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          onClick={handleMenuItemClick}
                          className={({ isActive }) => getMenuItemClasses(isActive)}
                        >
                          <CustomIcon className="w-5 h-5 flex-shrink-0" />
                          {!collapsed && <span className="text-sm">{customLabel}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );

                  return canEditMenu ? (
                    <ContextMenu key={item.title}>
                      <ContextMenuTrigger>
                        {menuItem}
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Menu Item
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ) : menuItem;
                }

                // Otherwise, render as collapsible category
                return (
                  <Collapsible
                    key={category.title}
                    defaultOpen={false}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="mx-2">
                          <category.icon className="w-5 h-5" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left text-sm">{category.title}</span>
                              <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenu className="ml-4 border-l pl-2 mt-1">
                          {category.items.map((item) => {
                            const itemKey = getMenuItemKey(item.title, item.url);
                            const CustomIcon = getCustomIcon(itemKey, item.icon);
                            const customLabel = getCustomLabel(itemKey, item.title);
                            
                            const menuItem = (
                              <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                  <NavLink 
                                    to={item.url}
                                    onClick={handleMenuItemClick}
                                    className={({ isActive }) => getMenuItemClasses(isActive)}
                                  >
                                    <CustomIcon className="w-4 h-4 flex-shrink-0" />
                                    {!collapsed && <span className="text-sm">{customLabel}</span>}
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );

                            return canEditMenu ? (
                              <ContextMenu key={item.title}>
                                <ContextMenuTrigger>
                                  {menuItem}
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Menu Item
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            ) : menuItem;
                          })}
                        </SidebarMenu>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}

              {/* Pending Approvals */}
              {menuConfig.approvals && (() => {
                const itemKey = getMenuItemKey(menuConfig.approvals.title, menuConfig.approvals.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.approvals.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.approvals.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.approvals.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* News - moved to top priority section */}

              {/* Admin Items (super_admin only) */}
              {menuConfig.admin && menuConfig.admin.map((item) => {
                const itemKey = getMenuItemKey(item.title, item.url);
                const CustomIcon = getCustomIcon(itemKey, item.icon);
                const customLabel = getCustomLabel(itemKey, item.title);
                
                const menuItem = (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu key={item.title}>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })}

              {/* Settings (tenant_admin & super_admin) */}
              {menuConfig.settings && (() => {
                const itemKey = getMenuItemKey(menuConfig.settings.title, menuConfig.settings.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.settings.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.settings.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.settings.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* User Management (tenant_admin & super_admin) */}
              {menuConfig.userManagement && (() => {
                const itemKey = getMenuItemKey(menuConfig.userManagement.title, menuConfig.userManagement.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.userManagement.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.userManagement.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.userManagement.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* Monthly Newsletter */}
              {menuConfig.newsletter && (() => {
                const itemKey = getMenuItemKey(menuConfig.newsletter.title, menuConfig.newsletter.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.newsletter.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.newsletter.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.newsletter.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* Documents - moved to top priority section */}

              {/* HR & Employee Assistance - moved to top priority section */}

              {/* Modality Details */}
              {menuConfig.modalityDetails && (() => {
                const itemKey = getMenuItemKey(menuConfig.modalityDetails.title, menuConfig.modalityDetails.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.modalityDetails.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.modalityDetails.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.modalityDetails.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* Help */}
              {menuConfig.help && (() => {
                const itemKey = getMenuItemKey(menuConfig.help.title, menuConfig.help.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.help.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.help.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.help.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => getMenuItemClasses(isActive)}
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        </div>
        
        {/* Footer - Clean modern style */}
        <div className="sticky bottom-0 px-4 py-4 border-t border-sidebar-border bg-sidebar-background space-y-3">
          {/* External Links Row */}
          {!collapsed && (
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                className="flex-1 h-10 border-sidebar-border bg-white hover:bg-sidebar-muted rounded-xl"
              >
                <a href="https://vrg.optiq.app" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                  <img src={optiqLogo} alt="Optiq" className="h-6 w-auto object-contain" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1 h-10 border-sidebar-border bg-white hover:bg-sidebar-muted rounded-xl"
              >
                <a href="https://crowdit.com.au/files/foxo/index.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                  <img src={foxoLogo} alt="Foxo" className="h-6 w-auto object-contain" />
                </a>
              </Button>
            </div>
          )}
          
          {/* Referrer Lookup */}
          <Button
            asChild
            className={`w-full h-11 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all duration-200 ${collapsed ? 'px-0' : ''}`}
          >
            <Link to="/referrer-lookup" className="flex items-center justify-center gap-2 w-full">
              <Search className={collapsed ? "h-5 w-5" : "h-4 w-4"} />
              {!collapsed && <span className="font-medium">Referrer Lookup</span>}
            </Link>
          </Button>
        </div>
      </SidebarContent>

      {/* Menu Item Editor Dialog */}
      {editingItem && (
        <MenuItemEditor
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          itemKey={editingItem.key}
          currentLabel={editingItem.label}
          currentIcon={editingItem.icon}
          onSave={handleSaveMenuItem}
        />
      )}
    </Sidebar>
  );
}