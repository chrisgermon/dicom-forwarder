import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '@/contexts/RBACContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface RBACProtectedRouteProps {
  children: ReactNode;
  /** Resource to check permission for (e.g., 'hardware', 'tickets') */
  resource: string;
  /** Action to check permission for (e.g., 'create', 'read', 'update', 'delete') */
  action: string;
  /** Custom fallback to show when permission is denied */
  fallback?: ReactNode;
  /** Redirect path when permission is denied (default: '/home') */
  redirectTo?: string;
  /** If true, shows fallback instead of redirecting */
  showFallback?: boolean;
}

/**
 * Route protection component using the new RBAC system.
 * Checks if the user has the required resource:action permission.
 *
 * @example
 * // Protect a route - redirect if no permission
 * <RBACProtectedRoute resource="hardware" action="create">
 *   <CreateHardwareForm />
 * </RBACProtectedRoute>
 *
 * @example
 * // Show custom fallback instead of redirecting
 * <RBACProtectedRoute
 *   resource="admin"
 *   action="manage"
 *   showFallback
 *   fallback={<AccessDeniedPage />}
 * >
 *   <AdminPanel />
 * </RBACProtectedRoute>
 */
export function RBACProtectedRoute({
  children,
  resource,
  action,
  fallback,
  redirectTo = '/home',
  showFallback = false,
}: RBACProtectedRouteProps) {
  const { hasPermission, loading, error } = useRBAC();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-muted-foreground">Loading permissions...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading permissions: {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Check permission
  const allowed = hasPermission(resource, action);

  if (!allowed) {
    // Show fallback if requested
    if (showFallback) {
      return fallback || (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this resource.
          </AlertDescription>
        </Alert>
      );
    }

    // Otherwise redirect
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version for wrapping route components
 */
export function withRBACProtection<P extends object>(
  Component: React.ComponentType<P>,
  resource: string,
  action: string,
  options?: {
    fallback?: ReactNode;
    redirectTo?: string;
    showFallback?: boolean;
  }
) {
  return function RBACProtectedComponent(props: P) {
    return (
      <RBACProtectedRoute
        resource={resource}
        action={action}
        fallback={options?.fallback}
        redirectTo={options?.redirectTo}
        showFallback={options?.showFallback}
      >
        <Component {...props} />
      </RBACProtectedRoute>
    );
  };
}
