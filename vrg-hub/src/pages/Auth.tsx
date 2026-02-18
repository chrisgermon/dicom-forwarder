import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Briefcase, FileCheck, Sparkles } from 'lucide-react';
const visionRadiologyLogo = '/vision-radiology-logo.png';
import { useAuth } from '@/hooks/useAuth';
import { extractSubdomain, getCompanyBySubdomain } from '@/lib/subdomain';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface CompanyTheme {
  id: string;
  name?: string;
  logo_url?: string;
  use_custom_colors?: boolean;
  primary_color?: string;
  background_color?: string;
  foreground_color?: string;
  card_color?: string;
  card_foreground_color?: string;
  muted_color?: string;
  muted_foreground_color?: string;
  border_color?: string;
  accent_color?: string;
}

// Brand logos - cycling animation with individual scaling for visual consistency
const brandLogos = [
  { name: 'Vision Radiology', logo: '/vision-radiology-logo.png', scale: 'scale-100' },
  { name: 'Light Radiology', logo: '/light-radiology-logo.png', scale: 'scale-125' },
  { name: 'Quantum Medical Imaging', logo: '/quantum-medical-imaging-logo.png', scale: 'scale-90' },
  { name: 'Focus Radiology', logo: '/focus-radiology-logo.png', scale: 'scale-110' },
];

export default function Auth() {
  const { signInWithAzure, user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<CompanyTheme | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);

  // Cycle through brand logos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLogoIndex((prev) => (prev + 1) % brandLogos.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Force custom domain for auth to ensure tokens land on correct origin
  // BUT only if there are no auth tokens in the URL
  useEffect(() => {
    const host = window.location.hostname;
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAuthTokens = hashParams.has('access_token') || hashParams.has('refresh_token');
    
    if (host.endsWith('.lovable.app') && !hasAuthTokens) {
      const target = 'https://hub.visionradiology.com.au' + window.location.pathname + window.location.search + window.location.hash;
      if (window.location.href !== target) {
        window.location.replace(target);
      }
    }
  }, []);

  // Handle magiclink tokens in URL (hash or query) and establish session explicitly
  useEffect(() => {
    // 0) Handle OAuth code exchange flow (some providers return ?code=...)
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) {
      setLoading(true);
      supabase.auth
        .exchangeCodeForSession(window.location.href)
        .then(({ error }) => {
          if (error) {
            logger.error('Error exchanging code for session', error);
            setError('There was a problem completing sign-in. Please try again.');
          } else {
            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);
            window.location.replace('/home');
          }
        })
        .finally(() => setLoading(false));
      return; // Stop further handling once code is processed
    }

    const tryHandleParams = (params: URLSearchParams) => {
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        setLoading(true);
        supabase.auth.setSession({ access_token, refresh_token })
          .then(({ error }) => {
            if (error) {
              logger.error('Error setting session from magic link', error);
              setError('There was a problem completing sign-in. Please try again.');
            } else {
              // Clean tokens from URL (remove both hash and query)
              window.history.replaceState(null, '', window.location.pathname);
              window.location.replace('/home');
            }
          })
          .finally(() => setLoading(false));
        return true;
      }
      return false;
    };

    // 1) Try hash params (#access_token=...)
    const hash = window.location.hash;
    if (hash) {
      const handled = tryHandleParams(new URLSearchParams(hash.substring(1)));
      if (handled) return;
    }

    // 2) Fallback: some flows may return tokens in the query string ?access_token=...
    const search = window.location.search;
    if (search) {
      tryHandleParams(new URLSearchParams(search.substring(1)));
    }
  }, [navigate]);

  // Load company data based on subdomain
  useEffect(() => {
    const loadCompanyData = async () => {
      const subdomain = extractSubdomain(window.location.hostname);
      if (subdomain) {
        const company = await getCompanyBySubdomain(subdomain);
        setCompanyData(company);
        
        // Apply custom colors if enabled
        if (company?.use_custom_colors) {
          const root = document.documentElement;
          const colorMap = {
            primary: company.primary_color,
            background: company.background_color,
            foreground: company.foreground_color,
            card: company.card_color,
            "card-foreground": company.card_foreground_color,
            muted: company.muted_color,
            "muted-foreground": company.muted_foreground_color,
            border: company.border_color,
            accent: company.accent_color,
          };

          Object.entries(colorMap).forEach(([key, value]) => {
            if (value) {
              root.style.setProperty(`--${key}`, value);
            }
          });
          
          // Store in localStorage for persistence
          localStorage.setItem('company_theme', JSON.stringify({
            companyId: company.id,
            colors: colorMap
          }));
        }
      }
      setLoadingCompany(false);
    };
    
    loadCompanyData();
  }, []);

  // Redirect authenticated users based on role
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/home');
    }
  }, [user, userRole, authLoading, navigate]);

  const handleAzureLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithAzure();
    } catch (err) {
      logger.error('Azure login error', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate Office 365 login');
      setLoading(false);
    }
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  const logo = companyData?.logo_url || visionRadiologyLogo;
  const companyName = companyData?.name || 'Vision Radiology';

  const features = [
    { icon: Briefcase, title: 'Company Resources', description: 'Access to company resources and assistance' },
    { icon: FileCheck, title: 'Document Access', description: 'Access company resources instantly' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          {/* Floating orbs */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-400/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
          />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center px-12 xl:px-20 text-white w-full">
          <div className="space-y-8 w-full max-w-md flex flex-col items-center text-center">
            {/* Company Name & Cycling Brand Logos */}
            <div className="animate-fade-in flex flex-col items-center w-full">
              <h2 className="text-3xl xl:text-4xl font-bold tracking-tight mb-8 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                Vision Radiology Group
              </h2>
              <div className="relative h-20 xl:h-24 w-full flex justify-center items-center">
                {brandLogos.map((brand, index) => (
                  <img
                    key={brand.name}
                    src={brand.logo}
                    alt={brand.name}
                    className={`absolute h-14 xl:h-18 max-w-[280px] object-contain brightness-0 invert transition-all duration-700 ease-in-out ${brand.scale} ${
                      index === currentLogoIndex 
                        ? 'opacity-100 blur-0' 
                        : 'opacity-0 blur-sm'
                    }`}
                    style={{
                      transitionProperty: 'opacity, transform, filter',
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Headline */}
            <div className="space-y-4 animate-fade-in flex flex-col items-center" style={{ animationDelay: '0.1s' }}>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-center">
                Welcome to Your
                <span className="block text-blue-200">Digital Workspace</span>
              </h1>
              <p className="text-lg text-blue-100/80 max-w-md text-center">
                Access all your resources and stay connected with the latest updates.
              </p>
            </div>
            
            {/* Feature cards */}
            <div className="space-y-4 pt-8 w-full">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="flex items-center gap-4 p-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                >
                  <div className="p-3 rounded-lg bg-white/20 shrink-0 flex items-center justify-center">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-base">{feature.title}</h3>
                    <p className="text-sm text-blue-100/70">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center animate-fade-in">
            <img src={logo} alt={companyName} className="h-14 mx-auto mb-6" />
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-elevated bg-white dark:bg-slate-800 animate-scale-in">
            <CardHeader className="text-center pb-2 pt-8">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-card">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Sign in with your organization's Office 365 account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 px-8 pb-8">
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {/* Requirements - collapsible style */}
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-200">Quick Access</h4>
                </div>
                <ul className="text-slate-500 dark:text-slate-400 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <span>Use your organization email address</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <span>Authorized domains only</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <span>Contact admin for access issues</span>
                  </li>
                </ul>
              </div>

              {/* Login Button */}
              <Button
                onClick={handleAzureLogin}
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-card hover:shadow-elevated transition-all duration-300 hover:scale-[1.02]"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 23 23">
                      <path d="M0 0h11v11H0z" fill="#f25022"/>
                      <path d="M12 0h11v11H12z" fill="#00a4ef"/>
                      <path d="M0 12h11v11H0z" fill="#ffb900"/>
                      <path d="M12 12h11v11H12z" fill="#7fba00"/>
                    </svg>
                    Continue with Microsoft
                  </>
                )}
              </Button>
              
              {/* Footer */}
              <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-600">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  System administrators?{' '}
                  <a href="/system-login" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium hover:underline transition-colors">
                    Use system login
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bottom text */}
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}