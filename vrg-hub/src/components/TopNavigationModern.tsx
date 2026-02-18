import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Menu,
  User,
  LogOut,
  ExternalLink,
  Home,
  Briefcase,
  FolderOpen,
  Settings as SettingsIcon,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserImpersonation } from "@/hooks/useUserImpersonation";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserImpersonationSelector } from "./UserImpersonationSelector";
import { GlobalSearch } from "./GlobalSearch";
import { PageHeader } from "./navigation/PageHeader";
import { WorkMegaMenu } from "./navigation/WorkMegaMenu";
import { CRMMegaMenu } from "./navigation/CRMMegaMenu";
import { ResourcesMegaMenu } from "./navigation/ResourcesMegaMenu";
import { ToolsMegaMenu } from "./navigation/ToolsMegaMenu";
import { AdminMegaMenu } from "./navigation/AdminMegaMenu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import crowdITLogo from "@/assets/crowdit-logo.png";
import optiqLogo from "@/assets/optiq-logo.png";

interface TopNavigationModernProps {
  children?: ReactNode;
}

export function TopNavigationModern({ children }: TopNavigationModernProps) {
  const { userRole, user, signOut } = useAuth();
  const { impersonatedUser, isImpersonating } = useUserImpersonation(userRole);
  const location = useLocation();
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem('company_logo_url') || crowdITLogo;
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdown]);

  useEffect(() => {
    const loadCompanyLogoAndAvatar = async () => {
      if (!user?.id) return;

      try {
        const [{ data: profileData, error: profileError }, { data: configData, error: configError }] = await Promise.all([
          supabase
            .from('profiles')
            .select('avatar_url, brand:brands(logo_url)')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('app_config')
            .select('logo_url')
            .limit(1)
            .maybeSingle(),
        ]);

        if (profileError) throw profileError;
        if (configError) throw configError;

        if (profileData?.avatar_url) {
          setAvatarUrl(profileData.avatar_url);
        }

        const brandLogo = profileData?.brand?.logo_url;
        if (brandLogo) {
          setLogoUrl(brandLogo);
          localStorage.setItem('company_logo_url', brandLogo);
          return;
        }

        if (configData?.logo_url) {
          setLogoUrl(configData.logo_url);
          localStorage.setItem('company_logo_url', configData.logo_url);
          return;
        }

        setLogoUrl(crowdITLogo);
        localStorage.setItem('company_logo_url', crowdITLogo);
      } catch (error) {
        console.error('Error loading company logo:', error);
        setLogoUrl(crowdITLogo);
        toast({
          title: 'Unable to load branding',
          description: 'Displaying the default logo while we reconnect.',
          variant: 'destructive',
        });
      }
    };

    loadCompanyLogoAndAvatar();
  }, [user?.id, toast]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Utility Bar - Thin top bar with quick links */}
      <div className="w-full bg-card/80 dark:bg-card/50 backdrop-blur-xl border-b border-border/30 dark:border-white/5 h-10">
        <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-6 h-full flex items-center justify-between">
          {/* Left: Quick Links */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <Link to="/requests" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              <span>Requests</span>
            </Link>
            <Link to="/company-documents" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Documents</span>
            </Link>
            {(userRole === 'super_admin' || userRole === 'tenant_admin') && (
              <Link to="/settings" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                <SettingsIcon className="h-3.5 w-3.5" />
                <span>Settings</span>
              </Link>
            )}
          </div>

          {/* Center: Global Search */}
          <div className="max-w-md flex-1">
            <GlobalSearch />
          </div>

          {/* Right: External Links, Notifications, User */}
          <div className="flex items-center gap-2">
            {/* External Links Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <a href="https://outlook.office.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between text-xs">
                    Outlook Web
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://teams.microsoft.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between text-xs">
                    Microsoft Teams
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="https://vrg.optiq.app" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between text-xs">
                    Optiq
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://crowdit.com.au/files/foxo/index.html" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between text-xs">
                    Foxo
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <div className="[&>button]:h-7 [&>button]:w-7">
              <NotificationsDropdown />
            </div>

            {/* Theme Toggle */}
            <div className="[&>button]:h-7 [&>button]:w-7">
              <ThemeToggle />
            </div>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative rounded-full transition-all duration-200 hover:ring-2 hover:ring-primary/20">
                  <Avatar className="w-7 h-7">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-[10px]">
                        {(() => {
                          const name = isImpersonating && impersonatedUser 
                            ? (impersonatedUser.full_name || impersonatedUser.email || '')
                            : (user?.user_metadata?.full_name || user?.email || '');
                          const nameParts = name.split(' ');
                          if (nameParts.length >= 2) {
                            return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
                          }
                          return name.substring(0, 2).toUpperCase();
                        })()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {isImpersonating && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-500 border border-background rounded-full" title="Impersonating" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt="Profile" />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                          {(() => {
                            const name = isImpersonating && impersonatedUser 
                              ? (impersonatedUser.full_name || impersonatedUser.email || '')
                              : (user?.user_metadata?.full_name || user?.email || '');
                            const nameParts = name.split(' ');
                            if (nameParts.length >= 2) {
                              return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
                            }
                            return name.substring(0, 2).toUpperCase();
                          })()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {isImpersonating && impersonatedUser
                          ? impersonatedUser.full_name || impersonatedUser.email
                          : user?.user_metadata?.full_name || user?.email
                        }
                      </p>
                      {((isImpersonating && impersonatedUser?.role) || userRole) && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {isImpersonating && <span className="text-yellow-600 dark:text-yellow-400">Viewing as: </span>}
                          {((impersonatedUser?.role || userRole) || '').replace('_', ' ')}
                        </p>
                      )}
                      {!isImpersonating && user?.email && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {userRole === 'super_admin' && (
                  <>
                    <div className="px-2 py-2">
                      <UserImpersonationSelector />
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Header - Logo and Page Title */}
      <header className="w-full bg-card/80 dark:bg-card/50 backdrop-blur-xl border-b border-border/30 dark:border-white/5">
        <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-6 py-6 flex items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center group flex-shrink-0">
            <img
              src={logoUrl}
              alt="Company Logo"
              className="w-auto h-12 md:h-14 object-contain transition-all duration-300"
              loading="lazy"
              decoding="async"
            />
          </Link>

          {/* Page Header - Dynamic title and subtitle */}
          <div className="hidden md:block flex-1 min-w-0">
            <PageHeader />
          </div>


          {/* Mobile menu button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden flex-shrink-0 ml-auto">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto" aria-describedby={undefined}>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                {/* Quick Links */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Links</h3>
                  <div className="space-y-1">
                    <Link 
                      to="/" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Home className="h-4 w-4" />
                      <span className="text-sm font-medium">Home</span>
                    </Link>
                    <Link 
                      to="/requests" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Briefcase className="h-4 w-4" />
                      <span className="text-sm font-medium">Requests</span>
                    </Link>
                    <Link 
                      to="/company-documents" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span className="text-sm font-medium">Documents</span>
                    </Link>
                  </div>
                </div>

                {/* Work Section */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Work</h3>
                  <div className="space-y-1">
                    <Link 
                      to="/requests" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-sm">My Requests</span>
                    </Link>
                    <Link 
                      to="/approvals" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-sm">Approvals</span>
                    </Link>
                  </div>
                </div>

                {/* CRM Section */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">CRM</h3>
                  <div className="space-y-1">
                    <Link 
                      to="/mlo-dashboard" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-sm">MLO Dashboard</span>
                    </Link>
                    <Link 
                      to="/mlo-campaigns" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-sm">Campaigns</span>
                    </Link>
                  </div>
                </div>

                {/* Resources Section */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resources</h3>
                  <div className="space-y-1">
                    <Link 
                      to="/mission-statement" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-sm">Mission Statement</span>
                    </Link>
                    <Link 
                      to="/directory" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-sm">Phone Directory</span>
                    </Link>
                    <Link 
                      to="/external-providers" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-sm">External Providers</span>
                    </Link>
                    <Link 
                      to="/cpd-tracker" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-sm">CPD Tracker</span>
                    </Link>
                  </div>
                </div>

                {/* Tools Section */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tools</h3>
                  <div className="space-y-1">
                    <Link 
                      to="/referrer-lookup" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-sm">Referrer Lookup</span>
                    </Link>
                    <Link 
                      to="/radiology-search" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-sm">Radiology Search</span>
                    </Link>
                  </div>
                </div>

                {/* Office 365 Section */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Office 365</h3>
                  <div className="space-y-1">
                    <a 
                      href="https://outlook.office.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                    >
                      <span className="text-sm">Outlook Web</span>
                      <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                    </a>
                    <a 
                      href="https://teams.microsoft.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                    >
                      <span className="text-sm">Microsoft Teams</span>
                      <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                    </a>
                    <a 
                      href="https://vrg.optiq.app" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                    >
                      <span className="text-sm">Optiq</span>
                      <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                    </a>
                  </div>
                </div>

                {/* Admin Section (if applicable) */}
                {(userRole === 'super_admin' || userRole === 'tenant_admin') && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Admin</h3>
                    <div className="space-y-1">
                      <Link 
                        to="/settings" 
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <SettingsIcon className="h-4 w-4" />
                        <span className="text-sm">Settings</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Navigation Bar - Main Menu Items */}
      <nav className="w-full bg-gradient-to-r from-slate-800/95 via-slate-700/95 to-slate-800/95 border-b border-slate-600/30 shadow-sm">
        <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-6">
          <div className="hidden lg:flex items-center gap-1 py-2.5" ref={dropdownRef}>
            {/* Work Dropdown */}
            <div className="relative">
              <button
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                  activeDropdown === 'work' || location.pathname.startsWith('/requests') || location.pathname.startsWith('/approvals')
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setActiveDropdown(activeDropdown === 'work' ? null : 'work')}
              >
                <span>Work</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'work' ? 'rotate-180' : ''}`} />
              </button>
              {activeDropdown === 'work' && (
                <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <WorkMegaMenu onClose={() => setActiveDropdown(null)} />
                </div>
              )}
            </div>

            {/* CRM Dropdown */}
            <div className="relative">
              <button
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                  activeDropdown === 'crm' || location.pathname.startsWith('/mlo-')
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setActiveDropdown(activeDropdown === 'crm' ? null : 'crm')}
              >
                <span>CRM</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'crm' ? 'rotate-180' : ''}`} />
              </button>
              {activeDropdown === 'crm' && (
                <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <CRMMegaMenu onClose={() => setActiveDropdown(null)} />
                </div>
              )}
            </div>

            {/* Resources Dropdown */}
            <div className="relative">
              <button
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                  activeDropdown === 'resources'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setActiveDropdown(activeDropdown === 'resources' ? null : 'resources')}
              >
                <span>Resources</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'resources' ? 'rotate-180' : ''}`} />
              </button>
              {activeDropdown === 'resources' && (
                <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <ResourcesMegaMenu onClose={() => setActiveDropdown(null)} />
                </div>
              )}
            </div>

            {/* Tools Dropdown */}
            <div className="relative">
              <button
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                  activeDropdown === 'tools' || location.pathname.includes('referrer-lookup') || location.pathname.includes('radiology-search')
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setActiveDropdown(activeDropdown === 'tools' ? null : 'tools')}
              >
                <span>Tools</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'tools' ? 'rotate-180' : ''}`} />
              </button>
              {activeDropdown === 'tools' && (
                <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <ToolsMegaMenu onClose={() => setActiveDropdown(null)} />
                </div>
              )}
            </div>

            {/* File Directory - Main Menu Item */}
            <Link
              to="/company-documents"
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                location.pathname === '/company-documents'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
              onClick={() => setActiveDropdown(null)}
            >
              <FolderOpen className="w-4 h-4" />
              <span>File Directory</span>
            </Link>

            {/* Executive Dashboard (super admin only) */}
            {userRole === 'super_admin' && (
              <Link
                to="/executive-dashboard"
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                  location.pathname === '/executive-dashboard'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setActiveDropdown(null)}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Executive</span>
              </Link>
            )}

            {/* Admin Dropdown (admin only) */}
            {(userRole === 'super_admin' || userRole === 'tenant_admin') && (
              <div className="relative">
                <button
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                    activeDropdown === 'admin'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => setActiveDropdown(activeDropdown === 'admin' ? null : 'admin')}
                >
                  <span>Admin</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'admin' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'admin' && (
                  <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <AdminMegaMenu onClose={() => setActiveDropdown(null)} />
                  </div>
                )}
              </div>
            )}

            {/* Optiq Button - Right aligned in nav bar */}
            <a 
              href="https://vrg.optiq.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-white/90 border border-white/30 transition-all duration-200 shadow-sm"
            >
              <img src={optiqLogo} alt="Optiq" className="h-4 w-auto object-contain" />
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
