import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Mail, RefreshCw, CheckCircle, XCircle, Clock, Eye, ChevronLeft, ChevronRight, FileText, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatAUDateTimeFull } from '@/lib/dateUtils';
import { formatRequestId } from '@/lib/requestUtils';

interface EmailLog {
  id: string;
  request_id?: string;
  marketing_request_id?: string;
  user_account_request_id?: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  sent_at: string;
  status: string;
  error_message?: string | null;
  metadata?: any;
  request_type?: string;
}

export function SystemEmailLogs() {
  const { userRole } = useAuth();
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEmailIndex, setSelectedEmailIndex] = useState<number>(-1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const selectedEmail = selectedEmailIndex >= 0 ? filteredEmails[selectedEmailIndex] : null;

  const handleViewEmail = (email: EmailLog) => {
    const index = filteredEmails.findIndex(e => e.id === email.id);
    setSelectedEmailIndex(index);
    setDialogOpen(true);
  };

  const handleNext = () => {
    if (selectedEmailIndex < filteredEmails.length - 1) {
      setSelectedEmailIndex(selectedEmailIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (selectedEmailIndex > 0) {
      setSelectedEmailIndex(selectedEmailIndex - 1);
    }
  };

  // Dialog close handled inline

  useEffect(() => {
    if (userRole === 'super_admin') {
      fetchEmailLogs();
    }
  }, [userRole]);

  useEffect(() => {
    applyFilters();
  }, [emails, searchQuery, statusFilter, typeFilter]);

  const fetchEmailLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching email logs:', error);
        throw error;
      }

      setEmails(data || []);
    } catch (error: any) {
      console.error('Error fetching email logs:', error);
      toast.error('Failed to load email logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...emails];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(email => 
        email.recipient_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.email_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(email => email.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(email => email.email_type === typeFilter);
    }

    setFilteredEmails(filtered);
  };

  const handleResendEmail = async (emailLogId: string) => {
    try {
      setResendingId(emailLogId);
      
      const { error } = await supabase.functions.invoke('resend-notification-email', {
        body: { emailLogId },
      });

      if (error) throw error;

      toast.success('Email resent successfully');
      fetchEmailLogs();
    } catch (error) {
      console.error('Error resending email:', error);
      toast.error('Failed to resend email');
    } finally {
      setResendingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Mail className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-emerald-500">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      // Request-related
      request_submitted: 'Request Submitted',
      request_approved: 'Request Approved',
      request_declined: 'Request Declined',
      request_ordered: 'Request Ordered',
      request_created: 'Request Created',
      request_assigned: 'Request Assigned',
      request_reassigned: 'Request Reassigned',
      request_status_changed: 'Request Status Changed',
      request_resolved: 'Request Resolved',
      request_escalated: 'Request Escalated',
      request_comment_reply: 'Request Comment Reply',
      request_comment_added: 'Request Comment Added',
      
      // Department & Marketing
      department_request_submitted: 'Department Request Submitted',
      marketing_request_submitted: 'Marketing Request Submitted',
      marketing_request_approved: 'Marketing Request Approved',
      marketing_request_declined: 'Marketing Request Declined',
      
      // Hardware & Orders
      hardware_order_notification: 'Hardware Order Notification',
      hardware_approval: 'Hardware Approval',
      order_confirmation: 'Order Confirmation',
      
      // User Management
      user_account_request_submitted: 'User Account Request',
      user_account_notification: 'User Account Notification',
      user_invite: 'User Invite',
      welcome_email: 'Welcome Email',
      
      // Other
      toner_request: 'Toner Request',
      approval_request: 'Approval Request',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const uniqueTypes = [...new Set(emails.map(email => email.email_type))].sort();

  if (userRole !== 'super_admin') {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Access Denied: Super Admin privileges required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            System Email Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading email logs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                System Email Logs
              </CardTitle>
              <CardDescription>
                Complete history of all emails sent by the system (last 500 emails)
              </CardDescription>
            </div>
            <Button onClick={fetchEmailLogs} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-semibold text-emerald-600">
                  {emails.filter(e => e.status === 'sent').length}
                </div>
                <div className="text-xs text-muted-foreground">Sent Successfully</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-red-600">
                  {emails.filter(e => e.status === 'failed').length}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-yellow-600">
                  {emails.filter(e => e.status === 'pending').length}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by recipient or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {getEmailTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredEmails.length} of {emails.length} emails
            </div>

            {/* Email logs table */}
            <div className="border rounded-lg">
              <ScrollArea className="h-[600px]">
                <Table resizable storageKey="email-logs">
                  <TableHeader>
                    <TableRow>
                      <TableHead columnId="sent">Sent At</TableHead>
                      <TableHead columnId="type">Type</TableHead>
                      <TableHead columnId="recipient">Recipient</TableHead>
                      <TableHead columnId="subject">Subject</TableHead>
                      <TableHead columnId="status">Status</TableHead>
                      <TableHead columnId="actions">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmails.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No email logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatAUDateTimeFull(email.sent_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="whitespace-nowrap">
                              {getEmailTypeLabel(email.email_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {email.recipient_email}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {email.subject}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {getStatusIcon(email.status)}
                              {getStatusBadge(email.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewEmail(email)}
                                className="h-8 px-2"
                              >
                                <Eye className="w-4 h-4 mr-1.5" />
                                View
                              </Button>
                              {email.status === 'failed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendEmail(email.id)}
                                  disabled={resendingId === email.id}
                                  title="Resend email"
                                  className="h-8 w-8 p-0"
                                >
                                  <RefreshCw className={`w-4 h-4 ${resendingId === email.id ? 'animate-spin' : ''}`} />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Email Details</span>
                  <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                    <span>{selectedEmailIndex + 1} of {filteredEmails.length}</span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Recipient Email</p>
                      <p className="text-sm font-mono">{selectedEmail.recipient_email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Sent At</p>
                      <p className="text-sm">
                        {formatAUDateTimeFull(selectedEmail.sent_at)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Email Type</p>
                      <Badge variant="outline">
                        {getEmailTypeLabel(selectedEmail.email_type)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedEmail.status)}
                        {getStatusBadge(selectedEmail.status)}
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Subject</p>
                      <p className="text-sm">{selectedEmail.subject}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Email Log ID</p>
                      <p className="text-sm font-mono break-all">{selectedEmail.id}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Request Type</p>
                      <p className="text-sm">{selectedEmail.request_type || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Related Request IDs */}
                {(selectedEmail.request_id || selectedEmail.marketing_request_id || selectedEmail.user_account_request_id) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Related Request IDs</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedEmail.request_id && (
                        <div className="p-3 rounded-lg border bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Hardware Request ID</p>
                          <p className="text-sm font-mono break-all">{formatRequestId(selectedEmail.request_id)}</p>
                        </div>
                      )}
                      {selectedEmail.marketing_request_id && (
                        <div className="p-3 rounded-lg border bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Marketing Request ID</p>
                          <p className="text-sm font-mono break-all">{formatRequestId(selectedEmail.marketing_request_id)}</p>
                        </div>
                      )}
                      {selectedEmail.user_account_request_id && (
                        <div className="p-3 rounded-lg border bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">User Account Request ID</p>
                          <p className="text-sm font-mono break-all">{formatRequestId(selectedEmail.user_account_request_id)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {selectedEmail.error_message && (
                  <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                    <h3 className="text-sm font-semibold mb-2 text-red-700 dark:text-red-400">Error Details</h3>
                    <p className="text-sm text-red-600 dark:text-red-300 font-mono whitespace-pre-wrap">
                      {selectedEmail.error_message}
                    </p>
                  </div>
                )}

                {/* Metadata */}
                {selectedEmail.metadata && Object.keys(selectedEmail.metadata).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Email Metadata
                    </h3>
                    <ScrollArea className="h-64 rounded-md border bg-muted/50 p-4">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(selectedEmail.metadata, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {/* Full Raw JSON */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Complete Raw Data
                  </h3>
                  <ScrollArea className="h-64 rounded-md border bg-muted/50 p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedEmail, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>

                {/* Navigation and Actions */}
                <div className="flex justify-between items-center gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={selectedEmailIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex gap-2">
                    {selectedEmail.status === 'failed' && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleResendEmail(selectedEmail.id)}
                        disabled={resendingId === selectedEmail.id}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${resendingId === selectedEmail.id ? 'animate-spin' : ''}`} />
                        Resend
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedEmail, null, 2));
                        toast.success('Copied to clipboard');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy JSON
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={selectedEmailIndex === filteredEmails.length - 1}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
