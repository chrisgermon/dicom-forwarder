import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ROLE_PRIORITY, type Profile, type Company, type UserRole } from '@/types/common';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  profile: Profile | null;
  company: Company | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithAzure: () => Promise<void>;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const { toast } = useToast();

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('rbac_user_roles')
        .select(`
          role:rbac_roles(name)
        `)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error fetching user roles', error);
        setUserRole('requester');
        return;
      }

      interface RoleData {
        role?: {
          name: string;
        } | null;
      }

      const roles = (data as RoleData[])
        ?.map((r) => r.role?.name)
        .filter((name): name is UserRole => Boolean(name)) || [];

      // Determine highest role via explicit priority
      const highest = roles.sort((a, b) => (ROLE_PRIORITY[b] ?? 0) - (ROLE_PRIORITY[a] ?? 0))[0] || 'requester';
      setUserRole(highest);
    } catch (err) {
      logger.error('Error fetching user roles', err);
      setUserRole('requester');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        logger.error('Error fetching profile', error);
        setProfile(null);
      } else {
        setProfile(data ?? null);
      }
    } catch (err) {
      logger.error('Error fetching profile', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer side-effects to avoid blocking auth state updates
        if (event === 'SIGNED_IN' && session?.user) {
          // Use the session token directly from the auth state change event
          const token = session.access_token;
          if (token) {
            setTimeout(() => {
              // Handle login logging and welcome email with explicit auth token
              (async () => {
                try {
                  // Log login with auth header
                  await supabase.functions.invoke('log-login', {
                    headers: { Authorization: `Bearer ${token}` },
                  }).catch((logError) => {
                    logger.error('Error logging login', logError);
                  });
                  
                  // Send welcome email on first login
                  await supabase.functions.invoke('send-welcome-email', {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                } catch (error) {
                  logger.error('Error in post-login tasks', error);
                }
              })();
            }, 0);
          }
        }
        
        // Fetch user role and profile when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      logger.error('Error getting session', err);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Activate user profile if this is their first sign-in
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, imported_from_o365')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile && !profile.is_active && profile.imported_from_o365) {
        await supabase
          .from('profiles')
          .update({ is_active: true })
          .eq('id', data.user.id);
      }
    }
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) throw error;
  };

  const signInWithAzure = async () => {
    try {
      // Call edge function to get Azure auth URL
      const { data, error } = await supabase.functions.invoke('azure-login-initiate');
      
      if (error) throw error;
      
      if (data?.authUrl) {
        // Redirect to Microsoft login
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error) {
      logger.error('Azure login error', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    setCompany(null);
    setUserRole(null);
    setSession(null);
    setUser(null);
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const refetchProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
    value={{
      user,
      session,
      userRole,
      loading,
      profile,
      company,
      signInWithPassword,
      signUp,
      signInWithAzure,
      signOut,
      refetchProfile,
    }}
      >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}