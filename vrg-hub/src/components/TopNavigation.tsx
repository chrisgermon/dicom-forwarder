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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  User,
  LogOut,
  ExternalLink,
  ChevronDown,
  Home,
  Briefcase,
  Users,
  BookOpen,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserImpersonation } from "@/hooks/useUserImpersonation";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserImpersonationSelector } from "./UserImpersonationSelector";
import { WorkMegaMenu } from "./navigation/WorkMegaMenu";
import { CRMMegaMenu } from "./navigation/CRMMegaMenu";
import { ResourcesMegaMenu } from "./navigation/ResourcesMegaMenu";
import { AdminMegaMenu } from "./navigation/AdminMegaMenu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import crowdITLogo from "@/assets/crowdit-logo.png";

interface TopNavigationProps {
  children?: ReactNode;
}

export function TopNavigation({ children }: TopNavigationProps) {
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

  // Helper to get display name from user
  const getDisplayName = (): string => {
    if (isImpersonating && impersonatedUser) {
      return impersonatedUser.full_name || impersonatedUser.email || '';
    }
    return user?.user_metadata?.full_name || user?.email || '';
  };

  // Helper to get initials from name
  const getInitials = (name: string): string => {
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar - Modern Glassmorphism Design */}
      <header className="fixed top-0 z-50 w-full transition-all duration-500">
        <div className="w-full px-4 lg:px-6 py-3">
          <div className="flex items-center h-14 gap-4">
          {/* Logo with Glow Effect */}
          <Link to="/" className="flex items-center group shrink-0 relative">
            <div className="relative">
              {/* Glow effects */}
              <div className="absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent blur-xl scale-150 transition-opacity duration-500 opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-40 blur-2xl transition-all duration-500 scale-150" />

              <img
                src={logoUrl}
                alt="Company Logo"
                className="w-auto h-10 md:h-11 lg:h-12 object-contain relative drop-shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-500"
                loading="lazy"
                decoding="async"
              />
            </div>
          </Link>

            {/* Spacer - Push nav to center */}
            <div className="flex-1" />

            {/* Desktop Navigation - Glassmorphism Pill - CENTERED */}
            <nav
              className="hidden lg:flex items-center gap-1 bg-white/10 dark:bg-black/10 backdrop-blur-md rounded-full px-2 py-1 border border-white/10 dark:border-white/5"
              ref={dropdownRef}
            >
              {/* Home */}
              <Link
                to="/"
                className={`relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-full flex items-center gap-2 ${
                  location.pathname === '/'
                    ? 'bg-white/20 text-foreground'
                    : 'text-foreground/90 hover:text-foreground hover:bg-white/10'
                }`}
                onClick={() => setActiveDropdown(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
                  <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                </svg>
                <span className="relative z-10">Home</span>
              </Link>

              {/* Work Dropdown */}
              <div className="relative">
                <button
                  className={`relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-full flex items-center gap-1 outline-none ${
                    activeDropdown === 'work' || location.pathname.startsWith('/requests') || location.pathname.startsWith('/approvals')
                      ? 'bg-white/20 text-foreground'
                      : 'text-foreground/90 hover:text-foreground hover:bg-white/10'
                  }`}
                  onClick={() => setActiveDropdown(activeDropdown === 'work' ? null : 'work')}
                >
                  <span>Work</span>
                  <ChevronDown className="w-4 h-4" />
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
                  className={`relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-full flex items-center gap-1 outline-none ${
                    activeDropdown === 'crm' || location.pathname.startsWith('/mlo-')
                      ? 'bg-white/20 text-foreground'
                      : 'text-foreground/90 hover:text-foreground hover:bg-white/10'
                  }`}
                  onClick={() => setActiveDropdown(activeDropdown === 'crm' ? null : 'crm')}
                >
                  <span>CRM</span>
                  <ChevronDown className="w-4 h-4" />
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
                  className={`relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-full flex items-center gap-1 outline-none ${
                    activeDropdown === 'resources'
                      ? 'bg-white/20 text-foreground'
                      : 'text-foreground/90 hover:text-foreground hover:bg-white/10'
                  }`}
                  onClick={() => setActiveDropdown(activeDropdown === 'resources' ? null : 'resources')}
                >
                  <span>Resources</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {activeDropdown === 'resources' && (
                  <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <ResourcesMegaMenu onClose={() => setActiveDropdown(null)} />
                  </div>
                )}
              </div>

              {/* Admin Dropdown (admin only) */}
              {(userRole === 'super_admin' || userRole === 'tenant_admin') && (
                <div className="relative">
                  <button
                    className={`relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-full flex items-center gap-1 outline-none ${
                      activeDropdown === 'admin'
                        ? 'bg-white/20 text-foreground'
                        : 'text-foreground/90 hover:text-foreground hover:bg-white/10'
                    }`}
                    onClick={() => setActiveDropdown(activeDropdown === 'admin' ? null : 'admin')}
                  >
                    <span>Admin</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {activeDropdown === 'admin' && (
                    <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <AdminMegaMenu onClose={() => setActiveDropdown(null)} />
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* Spacer - Push right section to the right */}
            <div className="flex-1" />

            {/* Right Section: Actions + User */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Menu Button with Sheet */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10 relative text-foreground hover:bg-white/10 rounded-xl">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0" aria-describedby={undefined}>
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-4 space-y-1">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      location.pathname === '/' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <Home className="h-5 w-5" />
                    <span className="font-medium">Home</span>
                  </Link>
                  <Link
                    to="/requests"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      location.pathname.startsWith('/requests') ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <Briefcase className="h-5 w-5" />
                    <span className="font-medium">Work</span>
                  </Link>
                  <Link
                    to="/crm"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      location.pathname.startsWith('/crm') ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <Users className="h-5 w-5" />
                    <span className="font-medium">CRM</span>
                  </Link>
                  <Link
                    to="/directory"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      location.pathname.startsWith('/directory') ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span className="font-medium">Resources</span>
                  </Link>
                  {userRole === 'super_admin' && (
                    <Link
                      to="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                        location.pathname.startsWith('/settings') ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="font-medium">Admin</span>
                    </Link>
                  )}
                  
                  <div className="border-t my-4 pt-4">
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Office Apps
                    </p>
                    <a
                      href="https://outlook.office.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">Outlook</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                    <a
                      href="https://teams.microsoft.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">Teams</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                    <a
                      href="https://www.office.com/launch/onedrive"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">OneDrive</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Office Applications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden lg:flex h-10 px-3 relative text-foreground hover:bg-white/10 rounded-full gap-2 text-sm font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                  Office Apps
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-popover">
                <DropdownMenuItem asChild>
                  <a href="https://outlook.office.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-500"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      Microsoft Outlook
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://teams.microsoft.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-purple-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      Microsoft Teams
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://www.office.com/launch/onedrive" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-sky-500"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                      Microsoft OneDrive
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="https://www.office.com/launch/word" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-600"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                      Microsoft Word
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://www.office.com/launch/excel" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-600"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
                      Microsoft Excel
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <NotificationsDropdown />

            {/* User Menu - Avatar Only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative rounded-full transition-all duration-200 hover:ring-2 hover:ring-primary/20 hover:scale-105">
                  <Avatar className="w-10 h-10">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-sm">
                        {getInitials(getDisplayName())}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {isImpersonating && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 border-2 border-background rounded-full" title="Impersonating" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {/* User Info Header */}
                <div className="px-3 py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt="Profile" />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                          {getInitials(getDisplayName())}
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

                {/* User Impersonation (super admin only) */}
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
      </header>

      {/* Main Content - Full width with top padding for fixed header */}
      <main className="flex-1 w-full pt-24 md:pt-28">
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
