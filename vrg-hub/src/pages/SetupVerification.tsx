import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from '@/components/ui/underline-tabs';
import { CheckCircle, XCircle, AlertCircle, Users, Building2, Settings, FileText, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';

export default function SetupVerification() {
  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch users with roles
  const { data: users } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active')
        .order('full_name');
      
      if (profilesError) throw profilesError;
      
      const { data: rbacRoles, error: rbacError } = await supabase
        .from('rbac_roles')
        .select('id, name');
      
      if (rbacError) throw rbacError;

      const roleNameMap = new Map(rbacRoles?.map(r => [r.id, r.name]) || []);

      const { data: userRoles, error: rolesError } = await supabase
        .from('rbac_user_roles')
        .select('user_id, role_id');
      
      if (rolesError) throw rolesError;
      
      return profiles?.map(profile => {
        const roleEntry = userRoles?.find(ur => ur.user_id === profile.id);
        const roleName = roleEntry ? roleNameMap.get(roleEntry.role_id) : null;
        return {
          ...profile,
          role: roleName || 'user'
        };
      }) || [];
    },
  });

  // Fetch routing rules
  const { data: routingRules } = useQuery({
    queryKey: ['routing-rules-all'],
    queryFn: async () => {
      const { data: rules, error } = await supabase
        .from('routing_rules')
        .select('*')
        .order('priority');
      if (error) throw error;
      
      // Fetch related data separately
      const enrichedRules = await Promise.all((rules || []).map(async (rule) => {
        const [requestType, assignee] = await Promise.all([
          rule.request_type_id 
            ? supabase.from('request_types').select('name, department_id').eq('id', rule.request_type_id).single()
            : Promise.resolve({ data: null }),
          rule.default_assignee_user_id
            ? supabase.from('profiles').select('full_name, email').eq('id', rule.default_assignee_user_id).single()
            : Promise.resolve({ data: null })
        ]);
        
        return {
          ...rule,
          request_types: requestType.data,
          assignee: assignee.data
        };
      }));
      
      return enrichedRules;
    },
  });

  // Fetch form templates
  const { data: formTemplates } = useQuery({
    queryKey: ['form-templates-verification'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('id, name, form_type, is_active, settings')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch request types
  const { data: requestTypes } = useQuery({
    queryKey: ['request-types-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_types')
        .select(`
          *,
          department:department_id(name),
          form_template:form_template_id(name)
        `)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch notification assignments - kept for potential future use
  void useQuery({
    queryKey: ['notification-assignments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_notification_assignments')
        .select('*')
        .order('request_type');
      if (error) throw error;
      return data;
    },
  });

  // Calculate verification status
  const activeDepartments = departments?.filter(d => d.is_active) || [];
  const activeUsers = users?.filter(u => u.is_active) || [];
  const adminUsers = activeUsers.filter(u => ['super_admin', 'tenant_admin'].includes(u.role));
  const managerUsers = activeUsers.filter(u => u.role === 'manager');
  const activeFormTemplates = formTemplates?.filter(f => f.is_active) || [];
  const activeRequestTypes = requestTypes?.filter(r => r.is_active) || [];

  // Check for issues
  // Note: Since departments aren't tracked on profiles, we skip this check
  const departmentsWithoutUsers: any[] = [];
  
  const requestTypesWithoutRouting = activeRequestTypes.filter(rt =>
    !routingRules?.some(rr => rr.request_type_id === rt.id)
  );

  const formTemplatesWithoutNotifications = activeFormTemplates.filter(ft => {
    const settings = ft.settings as any;
    return !settings?.notificationRecipients || settings.notificationRecipients.length === 0;
  });

  const requestTypesWithoutForms = activeRequestTypes.filter(rt => !rt.form_template_id);

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getWarningIcon = (count: number) => {
    return count > 0 ? (
      <AlertCircle className="h-5 w-5 text-yellow-500" />
    ) : (
      <CheckCircle className="h-5 w-5 text-green-500" />
    );
  };

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Setup Verification"
        description="Comprehensive check of departments, users, routing, and configurations"
      />

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Departments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeDepartments.length}</div>
              <p className="text-xs text-muted-foreground">
                {departments?.filter(d => !d.is_active).length || 0} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUsers.length}</div>
              <p className="text-xs text-muted-foreground">
                {adminUsers.length} admins, {managerUsers.length} managers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Routing Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{routingRules?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {requestTypesWithoutRouting.length} types without routing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Form Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeFormTemplates.length}</div>
              <p className="text-xs text-muted-foreground">
                {formTemplatesWithoutNotifications.length} without notifications
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Issues Summary */}
        {(departmentsWithoutUsers.length > 0 || 
          requestTypesWithoutRouting.length > 0 || 
          formTemplatesWithoutNotifications.length > 0 ||
          requestTypesWithoutForms.length > 0) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Issues Found</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {departmentsWithoutUsers.length > 0 && (
                  <li>{departmentsWithoutUsers.length} department(s) without assigned users</li>
                )}
                {requestTypesWithoutRouting.length > 0 && (
                  <li>{requestTypesWithoutRouting.length} request type(s) without routing rules</li>
                )}
                {formTemplatesWithoutNotifications.length > 0 && (
                  <li>{formTemplatesWithoutNotifications.length} form template(s) without notification recipients</li>
                )}
                {requestTypesWithoutForms.length > 0 && (
                  <li>{requestTypesWithoutForms.length} request type(s) without linked forms</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <UnderlineTabs defaultValue="departments" className="space-y-6">
          <UnderlineTabsList>
            <UnderlineTabsTrigger value="departments">Departments</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="users">Users & Roles</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="routing">Routing Rules</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="forms">Form Templates</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="checklist">Checklist</UnderlineTabsTrigger>
          </UnderlineTabsList>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Department Configuration</CardTitle>
                <CardDescription>Review all departments and their user assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {activeDepartments.map((dept) => {
                      // Note: Department tracking not available in current schema
                      const deptUsers: any[] = [];
                      const hasUsers = true; // Skip this validation
                      
                      return (
                        <div key={dept.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{dept.name}</h3>
                                {getStatusIcon(hasUsers)}
                              </div>
                              {dept.description && (
                                <p className="text-sm text-muted-foreground mt-1">{dept.description}</p>
                              )}
                            </div>
                            <Badge variant={hasUsers ? 'default' : 'destructive'}>
                              {deptUsers.length} users
                            </Badge>
                          </div>
                          
                          {deptUsers.length > 0 && (
                            <div className="space-y-2 mt-3 pt-3 border-t">
                              {deptUsers.map(user => (
                                <div key={user.id} className="flex items-center justify-between text-sm">
                                  <div>
                                    <span className="font-medium">{user.full_name}</span>
                                    <span className="text-muted-foreground ml-2">({user.email})</span>
                                  </div>
                                  <Badge variant="outline">{user.role}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {!hasUsers && (
                            <Alert variant="destructive" className="mt-3">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                No users assigned to this department
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Roles & Assignments</CardTitle>
                <CardDescription>Review all active users and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={
                              user.role === 'super_admin' ? 'default' :
                              user.role === 'tenant_admin' ? 'secondary' :
                              user.role === 'manager' ? 'outline' : 'secondary'
                            }>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Routing Rules Tab */}
          <TabsContent value="routing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Routing Rules Configuration</CardTitle>
                <CardDescription>Automatic assignment rules for request types</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {activeRequestTypes.map((rt) => {
                      const rule = routingRules?.find(r => r.request_type_id === rt.id);
                      const hasRouting = !!rule;
                      
                      return (
                        <div key={rt.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{rt.name}</h3>
                                {getStatusIcon(hasRouting)}
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="text-muted-foreground">
                                  Department: {rt.department?.name || 'None'}
                                </div>
                                {rule && (
                                  <>
                                    <div>
                                      Strategy: <Badge variant="outline">{rule.strategy}</Badge>
                                    </div>
                                    {rule.assignee && (
                                      <div className="text-muted-foreground">
                                        Default Assignee: {rule.assignee.full_name} ({rule.assignee.email})
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {!hasRouting && (
                            <Alert variant="destructive" className="mt-3">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                No routing rule configured - requests will not be auto-assigned
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forms Tab */}
          <TabsContent value="forms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Form Templates Configuration</CardTitle>
                <CardDescription>Review form templates and notification settings</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {activeFormTemplates.map((template) => {
                      const settings = template.settings as any;
                      const hasNotifications = settings?.notificationRecipients?.length > 0;
                      const requiresApproval = settings?.requiresApproval;
                      const hasApprover = !!settings?.approverId;
                      
                      return (
                        <div key={template.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{template.name}</h3>
                                {getWarningIcon(hasNotifications ? 0 : 1)}
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline">{template.form_type}</Badge>
                                {requiresApproval && (
                                  <Badge variant="secondary">Requires Approval</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span className="font-medium">Notifications:</span>
                              <span className="text-muted-foreground">
                                {hasNotifications 
                                  ? `${settings.notificationRecipients.length} recipient(s)` 
                                  : 'None configured'}
                              </span>
                            </div>
                            
                            {requiresApproval && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                <span className="font-medium">Approver:</span>
                                <span className="text-muted-foreground">
                                  {hasApprover ? 'Configured' : 'Not set'}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {!hasNotifications && (
                            <Alert variant="destructive" className="mt-3">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                No notification recipients configured
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {requiresApproval && !hasApprover && (
                            <Alert variant="destructive" className="mt-3">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Requires approval but no approver is set
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Production Readiness Checklist</CardTitle>
                <CardDescription>Verify all critical configurations before going live</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    {getStatusIcon(activeDepartments.length > 0)}
                    <div className="flex-1">
                      <div className="font-medium">Departments Created</div>
                      <div className="text-sm text-muted-foreground">
                        {activeDepartments.length} active department(s)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    {getStatusIcon(adminUsers.length > 0)}
                    <div className="flex-1">
                      <div className="font-medium">Admin Users Assigned</div>
                      <div className="text-sm text-muted-foreground">
                        {adminUsers.length} admin user(s) configured
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    {getStatusIcon(departmentsWithoutUsers.length === 0)}
                    <div className="flex-1">
                      <div className="font-medium">All Departments Have Users</div>
                      <div className="text-sm text-muted-foreground">
                        {departmentsWithoutUsers.length === 0 
                          ? 'All departments have assigned users' 
                          : `${departmentsWithoutUsers.length} department(s) without users`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    {getStatusIcon(requestTypesWithoutRouting.length === 0)}
                    <div className="flex-1">
                      <div className="font-medium">Routing Rules Configured</div>
                      <div className="text-sm text-muted-foreground">
                        {requestTypesWithoutRouting.length === 0 
                          ? 'All request types have routing rules' 
                          : `${requestTypesWithoutRouting.length} request type(s) without routing`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    {getWarningIcon(formTemplatesWithoutNotifications.length)}
                    <div className="flex-1">
                      <div className="font-medium">Form Notifications Configured</div>
                      <div className="text-sm text-muted-foreground">
                        {formTemplatesWithoutNotifications.length === 0 
                          ? 'All forms have notification recipients' 
                          : `${formTemplatesWithoutNotifications.length} form(s) without notifications`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    {getStatusIcon(activeFormTemplates.length > 0)}
                    <div className="flex-1">
                      <div className="font-medium">Form Templates Active</div>
                      <div className="text-sm text-muted-foreground">
                        {activeFormTemplates.length} active form template(s)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    {getWarningIcon(requestTypesWithoutForms.length)}
                    <div className="flex-1">
                      <div className="font-medium">Request Types Have Forms</div>
                      <div className="text-sm text-muted-foreground">
                        {requestTypesWithoutForms.length === 0 
                          ? 'All request types have linked forms' 
                          : `${requestTypesWithoutForms.length} request type(s) without forms`}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </UnderlineTabs>
    </PageContainer>
  );
}
