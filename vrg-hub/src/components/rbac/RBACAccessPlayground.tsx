import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { PlayCircle, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
}

interface TraceStep {
  step: string;
  result: 'allow' | 'deny' | 'skip';
  reason: string;
}

export function RBACAccessPlayground() {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [result, setResult] = useState<{ allowed: boolean; trace?: TraceStep[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const { checkPermission } = useRBACPermissions();

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('rbac_permissions')
        .select('id, resource, action')
        .order('resource')
        .order('action');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    }
  };

  const handleTestAccess = async () => {
    if (!selectedUserId || !selectedResource || !selectedAction) {
      toast.error('Please select all fields');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const checkResult = await checkPermission(
        selectedResource,
        selectedAction,
        {
          userId: selectedUserId,
          includeTrace: true
        }
      );

      setResult(checkResult);
    } catch (error) {
      console.error('Error checking permission:', error);
      toast.error('Failed to check permission');
    } finally {
      setLoading(false);
    }
  };

  const uniqueResources = [...new Set(permissions.map(p => p.resource))];
  const actionsForResource = selectedResource
    ? permissions.filter(p => p.resource === selectedResource).map(p => p.action)
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Access Check Playground
          </CardTitle>
          <CardDescription>
            Test permission evaluation for any user and action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resource</Label>
              <Select value={selectedResource} onValueChange={(value) => {
                setSelectedResource(value);
                setSelectedAction('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resource" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueResources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={selectedAction}
                onValueChange={setSelectedAction}
                disabled={!selectedResource}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {actionsForResource.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleTestAccess} disabled={loading || !selectedUserId || !selectedResource || !selectedAction} className="w-full">
            <PlayCircle className="w-4 h-4 mr-2" />
            {loading ? 'Checking...' : 'Test Access'}
          </Button>

          {result && (
            <div className="space-y-4">
              <Alert className={result.allowed ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {result.allowed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-lg">
                      {result.allowed ? 'Access Allowed' : 'Access Denied'}
                    </div>
                    <AlertDescription className="mt-1">
                      Permission check for <span className="font-mono">{selectedResource}:{selectedAction}</span>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

              {result.trace && result.trace.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Decision Trace</CardTitle>
                    <CardDescription>Step-by-step evaluation process</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.trace.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 border rounded-lg"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {step.result === 'allow' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : step.result === 'deny' ? (
                              <XCircle className="w-4 h-4 text-red-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{step.step}</span>
                              <Badge variant={
                                step.result === 'allow' ? 'default' :
                                step.result === 'deny' ? 'destructive' :
                                'outline'
                              }>
                                {step.result}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{step.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
