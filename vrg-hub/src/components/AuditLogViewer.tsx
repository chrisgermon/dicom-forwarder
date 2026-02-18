import { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, FileText, Database, Calendar, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatAUDateTimeFull } from '@/lib/dateUtils';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
}

export function AuditLogViewer() {
  const { userRole } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [selectedLogIndex, setSelectedLogIndex] = useState<number>(-1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedLog = selectedLogIndex >= 0 ? filteredLogs[selectedLogIndex] : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  const handleViewLog = (log: AuditLog) => {
    const index = filteredLogs.findIndex(l => l.id === log.id);
    setSelectedLogIndex(index);
    setDialogOpen(true);
  };

  const handleNext = () => {
    if (selectedLogIndex < filteredLogs.length - 1) {
      setSelectedLogIndex(selectedLogIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (selectedLogIndex > 0) {
      setSelectedLogIndex(selectedLogIndex - 1);
    }
  };

  // Dialog close is handled inline where needed

  useEffect(() => {
    if (userRole === 'super_admin') {
      fetchAuditLogs();
    }
  }, [userRole]);

  useEffect(() => {
    applyFilters();
  }, [logs, searchQuery, actionFilter, tableFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500); // Last 500 logs

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Table filter
    if (tableFilter !== 'all') {
      filtered = filtered.filter(log => log.table_name === tableFilter);
    }

    setFilteredLogs(filtered);
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  const uniqueTables = [...new Set(logs.map(log => log.table_name))].sort();

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
            <FileText className="w-5 h-5" />
            System Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading audit logs...</div>
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
                <FileText className="w-5 h-5" />
                System Audit Log
              </CardTitle>
              <CardDescription>
                Complete audit trail of all system operations (last 500 entries)
              </CardDescription>
            </div>
            <Button onClick={fetchAuditLogs} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by user, table, or action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">Insert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  {uniqueTables.map(table => (
                    <SelectItem key={table} value={table}>{table}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>

            {/* Audit log table - virtualized for performance */}
            <div ref={scrollRef} className="border rounded-lg h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    position: 'relative',
                  }}
                >
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const log = filteredLogs[virtualRow.index];
                      return (
                        <TableRow
                          key={log.id}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <TableCell className="text-sm font-mono">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {formatAUDateTimeFull(log.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.user_email || 'System'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="w-full justify-center">
                              {log.table_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">
                            {log.record_id?.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewLog(log)}
                            >
                              View More
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  </TableBody>
                </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Audit Log Details</span>
                  <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                    <span>{selectedLogIndex + 1} of {filteredLogs.length}</span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">User Email</p>
                      <p className="text-sm font-mono">{selectedLog.user_email || 'System'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">User ID</p>
                      <p className="text-sm font-mono">{selectedLog.user_id || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Timestamp</p>
                      <p className="text-sm">
                        {formatAUDateTimeFull(selectedLog.created_at)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Action Type</p>
                      <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                        {selectedLog.action}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Table Name</p>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Database className="w-3 h-3" />
                        {selectedLog.table_name}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Record ID</p>
                      <p className="text-sm font-mono break-all">{selectedLog.record_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Previous Data */}
                {selectedLog.old_data && Object.keys(selectedLog.old_data).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Previous Data (Before {selectedLog.action})
                    </h3>
                    <ScrollArea className="h-64 rounded-md border bg-muted/50 p-4">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(selectedLog.old_data, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {/* New Data */}
                {selectedLog.new_data && Object.keys(selectedLog.new_data).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      New Data (After {selectedLog.action})
                    </h3>
                    <ScrollArea className="h-64 rounded-md border bg-muted/50 p-4">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(selectedLog.new_data, null, 2)}
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
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>

                {/* Navigation and Actions */}
                <div className="flex justify-between items-center gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={selectedLogIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                      toast.success('Copied to clipboard');
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy JSON
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={selectedLogIndex === filteredLogs.length - 1}
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
