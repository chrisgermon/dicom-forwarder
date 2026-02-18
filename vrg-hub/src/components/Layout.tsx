import { ReactNode, Suspense, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopNavigationModern } from "./TopNavigationModern";
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu, ExternalLink } from "lucide-react";
import crowdITLogo from "@/assets/crowdit-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useNavigationLayout } from "@/hooks/useNavigationLayout";
import { NewsletterBanner } from "./newsletter/NewsletterBanner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { Footer } from "./Footer";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useUserImpersonation } from "@/hooks/useUserImpersonation";
import { UserImpersonationSelector } from "./UserImpersonationSelector";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { RouteLoading } from "./RouteLoading";
import { SystemBanners } from "./banners/SystemBanners";
import { ProfileDialog } from "./ProfileDialog";
import { FirstTimeSetupDialog } from "./FirstTimeSetupDialog";
import { useToast } from "@/hooks/use-toast";
import { RostersDropdown, RostersDropdownContent } from "./RostersDropdown";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { userRole, user, signOut } = useAuth();
  const { impersonatedUser, isImpersonating } = useUserImpersonation(userRole);
  const { isTopNavLayout } = useNavigationLayout();
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    // Initialize with cached logo if available
    return localStorage.getItem('company_logo_url') || crowdITLogo;
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const { toast } = useToast();

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

        // Set avatar URL
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

  // Render top navigation layout
  if (isTopNavLayout) {
    return (
      <>
        <FirstTimeSetupDialog />
        <ImpersonationBanner />
        <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

        <TopNavigationModern>
          <NewsletterBanner />
          <SystemBanners />
          <Suspense fallback={<RouteLoading />}>
            {children}
          </Suspense>
        </TopNavigationModern>

      </>
    );
  }

  // Render sidebar layout (default)
  return (
    <>
      <FirstTimeSetupDialog />
      <ImpersonationBanner />
      <SidebarProvider className={isImpersonating ? "pt-12" : ""}>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar userRole={userRole as any} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 md:h-16 border-b bg-card shadow-sm flex items-center px-2 md:px-4 lg:px-6 overflow-hidden">
            {/* Left section: Sidebar trigger + Logo */}
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <SidebarTrigger className="h-8 w-8 md:h-9 md:w-9" />
              <img
                src={logoUrl}
                alt="Company Logo"
                className="h-7 md:h-9 object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
            
            {/* Separator */}
            <div className="hidden lg:block h-6 w-px bg-border mx-3 shrink-0" />
              
            {/* Desktop Navigation - only on large screens */}
            <NavigationMenu className="hidden lg:flex flex-1 min-w-0">
              <NavigationMenuList className="gap-1">
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link to="/mission-statement" className="group inline-flex h-8 items-center justify-center rounded-full bg-muted/50 px-3.5 text-sm font-medium text-foreground/80 transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm focus:bg-primary focus:text-primary-foreground focus:outline-none whitespace-nowrap">
                      Mission Statement
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link to="/directory" className="group inline-flex h-8 items-center justify-center rounded-full bg-muted/50 px-3.5 text-sm font-medium text-foreground/80 transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm focus:bg-primary focus:text-primary-foreground focus:outline-none whitespace-nowrap">
                      Phone Directory
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link to="/external-providers" className="group inline-flex h-8 items-center justify-center rounded-full bg-muted/50 px-3.5 text-sm font-medium text-foreground/80 transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm focus:bg-primary focus:text-primary-foreground focus:outline-none whitespace-nowrap">
                      External Providers
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {/* Rosters dropdown in desktop nav */}
                <NavigationMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="group inline-flex h-8 items-center justify-center rounded-full bg-muted/50 px-3.5 text-sm font-medium text-foreground/80 transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm focus:bg-primary focus:text-primary-foreground focus:outline-none whitespace-nowrap">
                      Rosters
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-popover">
                      <RostersDropdownContent />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="https://outlook.office.com" target="_blank" rel="noopener noreferrer" className="group inline-flex h-8 items-center justify-center rounded-full bg-muted/50 px-3.5 text-sm font-medium text-foreground/80 transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm focus:bg-primary focus:text-primary-foreground focus:outline-none whitespace-nowrap">
                      Outlook Web
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="https://teams.microsoft.com" target="_blank" rel="noopener noreferrer" className="group inline-flex h-8 items-center justify-center rounded-full bg-muted/50 px-3.5 text-sm font-medium text-foreground/80 transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm focus:bg-primary focus:text-primary-foreground focus:outline-none whitespace-nowrap">
                      Microsoft Teams
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Spacer for non-lg screens */}
            <div className="flex-1 min-w-0 lg:hidden" />

            {/* Mobile/Tablet dropdown menu for quick links */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <Menu className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <DropdownMenuItem asChild>
                  <Link to="/mission-statement" className="cursor-pointer">
                    Mission Statement
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/directory" className="cursor-pointer">
                    Phone Directory
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/external-providers" className="cursor-pointer">
                    External Providers
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <RostersDropdown />
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="https://outlook.office.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between">
                    Outlook Web
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="https://teams.microsoft.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center justify-between">
                    Microsoft Teams
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Right section: Actions + User */}
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
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

                  {/* User Impersonation (super admin only) */}
                  {userRole === 'super_admin' && (
                    <>
                      <div className="px-2 py-2">
                        <UserImpersonationSelector />
                      </div>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem onClick={() => setProfileOpen(true)} className="cursor-pointer">
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
          </header>
          
          <main className="flex-1 p-3 md:p-6 pb-20">
            <div className="max-w-screen-2xl mx-auto">
              <NewsletterBanner />
              <SystemBanners />
              <Suspense fallback={<RouteLoading />}>
                {children}
              </Suspense>
            </div>
          </main>
          <Footer />
          </div>
        </div>
        <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </SidebarProvider>

    </>
  );
}