/**
 * Route-level error boundary for React Router
 * Catches errors in route components and displays a recovery UI
 */

import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { structuredLogger } from '@/lib/structured-logger';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  // Log the error
  structuredLogger.error(
    'Route error occurred',
    error instanceof Error ? error : new Error(String(error)),
    { component: 'RouteErrorBoundary' }
  );

  let title = 'Something went wrong';
  let description = 'An unexpected error occurred while loading this page.';
  let statusCode: number | undefined;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    switch (error.status) {
      case 404:
        title = 'Page not found';
        description = 'The page you\'re looking for doesn\'t exist or has been moved.';
        break;
      case 401:
        title = 'Unauthorized';
        description = 'You need to be logged in to view this page.';
        break;
      case 403:
        title = 'Access denied';
        description = 'You don\'t have permission to view this page.';
        break;
      case 500:
        title = 'Server error';
        description = 'Something went wrong on our end. Please try again later.';
        break;
      default:
        description = error.statusText || description;
    }
  }

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-muted/50 to-background">
      <Card className="max-w-lg w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">
            {statusCode && <span className="text-muted-foreground mr-2">{statusCode}</span>}
            {title}
          </CardTitle>
          <CardDescription className="text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show error details in development */}
          {import.meta.env.DEV && error && (
            <div className="bg-muted rounded-lg p-4 overflow-auto max-h-40">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="outline" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={handleGoHome}>
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {!import.meta.env.DEV && (
            <p className="text-center text-sm text-muted-foreground">
              Error code:{' '}
              <code className="bg-muted px-2 py-1 rounded">
                {Date.now().toString(36).toUpperCase()}
              </code>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
