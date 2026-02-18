import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Share2,
  Link as LinkIcon,
  Mail,
  Copy,
  Check,
  Eye,
  Edit,
  Download,
  Calendar,
  Shield,
  Users,
  User,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { toast } from "sonner";
// cn utility available if needed

export type SharePermission = 'view' | 'edit' | 'download';
export type ShareScope = 'specific' | 'department' | 'organization' | 'external';

export interface ShareLink {
  id: string;
  url: string;
  permissions: SharePermission[];
  scope: ShareScope;
  expiresAt?: string;
  requiresPassword?: boolean;
  allowedEmails?: string[];
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  accessCount: number;
}

export interface ShareRecipient {
  id: string;
  email: string;
  name?: string;
  permissions: SharePermission[];
  notified: boolean;
  accessedAt?: string;
}

interface FileShareDialogProps {
  fileId: string;
  fileName: string;
  fileUrl: string;
  existingLinks?: ShareLink[];
  existingRecipients?: ShareRecipient[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateLink?: (config: {
    permissions: SharePermission[];
    scope: ShareScope;
    expiresAt?: Date;
    requiresPassword?: boolean;
    password?: string;
  }) => Promise<ShareLink>;
  onShareWithUsers?: (emails: string[], permissions: SharePermission[], message?: string) => Promise<void>;
  onRevokeLink?: (linkId: string) => Promise<void>;
}

/**
 * File Share Dialog Component
 * Secure file sharing with granular permission control
 * Supports both link-based and email-based sharing
 */
export function FileShareDialog({
  fileId: _fileId,
  fileName,
  fileUrl: _fileUrl,
  existingLinks = [],
  existingRecipients = [],
  open,
  onOpenChange,
  onCreateLink,
  onShareWithUsers,
  onRevokeLink,
}: FileShareDialogProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'email'>('link');
  const [selectedPermissions, setSelectedPermissions] = useState<SharePermission[]>(['view']);
  const [scope, setScope] = useState<ShareScope>('specific');
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [emails, setEmails] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<ShareLink | null>(null);

  const handleGenerateLink = async () => {
    if (requirePassword && !password) {
      toast.error('Please enter a password');
      return;
    }

    setGenerating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const link = await onCreateLink?.({
        permissions: selectedPermissions,
        scope,
        expiresAt,
        requiresPassword: requirePassword,
        password: requirePassword ? password : undefined,
      });

      if (link) {
        setGeneratedLink(link);
        toast.success('Share link created');
      }
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to create share link');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleShareByEmail = async () => {
    const emailList = emails.split(/[,;\n]/).map(e => e.trim()).filter(Boolean);

    if (emailList.length === 0) {
      toast.error('Please enter at least one email address');
      return;
    }

    setGenerating(true);
    try {
      await onShareWithUsers?.(emailList, selectedPermissions, emailMessage);
      toast.success(`Shared with ${emailList.length} recipient(s)`);
      setEmails('');
      setEmailMessage('');
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share file');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    try {
      await onRevokeLink?.(linkId);
      toast.success('Share link revoked');
    } catch (error) {
      console.error('Error revoking link:', error);
      toast.error('Failed to revoke link');
    }
  };

  const togglePermission = (permission: SharePermission) => {
    setSelectedPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const getPermissionIcon = (permission: SharePermission) => {
    switch (permission) {
      case 'view': return <Eye className="h-3 w-3" />;
      case 'edit': return <Edit className="h-3 w-3" />;
      case 'download': return <Download className="h-3 w-3" />;
    }
  };

  const getScopeIcon = (scope: ShareScope) => {
    switch (scope) {
      case 'specific': return <User className="h-3 w-3" />;
      case 'department': return <Users className="h-3 w-3" />;
      case 'organization': return <Shield className="h-3 w-3" />;
      case 'external': return <ExternalLink className="h-3 w-3" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share File
          </DialogTitle>
          <DialogDescription>
            Share <span className="font-medium">{fileName}</span> with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab Selection */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={activeTab === 'link' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('link')}
              className="flex-1"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Share Link
            </Button>
            <Button
              variant={activeTab === 'email' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('email')}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Share by Email
            </Button>
          </div>

          {/* Link Sharing */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              {/* Permissions */}
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="flex gap-2">
                  {(['view', 'edit', 'download'] as SharePermission[]).map((permission) => (
                    <Button
                      key={permission}
                      variant={selectedPermissions.includes(permission) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => togglePermission(permission)}
                      className="flex-1"
                    >
                      {getPermissionIcon(permission)}
                      <span className="ml-2 capitalize">{permission}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <Label>Share With</Label>
                <Select value={scope} onValueChange={(v) => setScope(v as ShareScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specific">Specific People (with link)</SelectItem>
                    <SelectItem value="department">Anyone in Department</SelectItem>
                    <SelectItem value="organization">Anyone in Organization</SelectItem>
                    <SelectItem value="external">External Users (less secure)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <Label>Link Expires In</Label>
                <Select value={expiryDays.toString()} onValueChange={(v) => setExpiryDays(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="0">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password Protection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-password">Password Protection</Label>
                  <Switch
                    id="require-password"
                    checked={requirePassword}
                    onCheckedChange={setRequirePassword}
                  />
                </div>
                {requirePassword && (
                  <Input
                    type="password"
                    placeholder="Enter password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </div>

              {/* Security Warning */}
              {scope === 'external' && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-warning mb-1">External Sharing Warning</p>
                    <p className="text-muted-foreground">
                      This file will be accessible to anyone with the link, including people outside
                      your organization. Ensure this complies with HIPAA and data protection policies.
                    </p>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerateLink}
                disabled={generating || selectedPermissions.length === 0}
                className="w-full"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Generate Share Link
              </Button>

              {/* Generated Link */}
              {generatedLink && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-success">Link Created Successfully</p>
                  <div className="flex gap-2">
                    <Input
                      value={generatedLink.url}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(generatedLink.url)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires {formatAUDateTimeFull(generatedLink.expiresAt || '')}
                    </span>
                    {generatedLink.requiresPassword && (
                      <Badge variant="outline" className="h-5">Password Protected</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Existing Links */}
              {existingLinks.length > 0 && (
                <div className="space-y-2">
                  <Label>Active Share Links</Label>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2 pr-4">
                      {existingLinks.map((link) => (
                        <div
                          key={link.id}
                          className="p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {getScopeIcon(link.scope)}
                              <span className="text-xs font-medium capitalize">
                                {link.scope.replace('_', ' ')}
                              </span>
                              <div className="flex gap-1">
                                {link.permissions.map((perm) => (
                                  <Badge key={perm} variant="outline" className="h-5 text-xs">
                                    {perm}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeLink(link.id)}
                              className="h-6 px-2 text-xs"
                            >
                              Revoke
                            </Button>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Accessed {link.accessCount} times</span>
                            {link.expiresAt && (
                              <span>Expires {formatAUDateTimeFull(link.expiresAt)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Email Sharing */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              {/* Email Addresses */}
              <div className="space-y-2">
                <Label htmlFor="emails">Email Addresses</Label>
                <Textarea
                  id="emails"
                  placeholder="Enter email addresses (separate with comma, semicolon, or new line)"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  You can enter multiple emails separated by commas or new lines
                </p>
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="flex gap-2">
                  {(['view', 'edit', 'download'] as SharePermission[]).map((permission) => (
                    <Button
                      key={permission}
                      variant={selectedPermissions.includes(permission) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => togglePermission(permission)}
                      className="flex-1"
                    >
                      {getPermissionIcon(permission)}
                      <span className="ml-2 capitalize">{permission}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Send Button */}
              <Button
                onClick={handleShareByEmail}
                disabled={generating || !emails.trim() || selectedPermissions.length === 0}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Invitations
              </Button>

              {/* Existing Recipients */}
              {existingRecipients.length > 0 && (
                <div className="space-y-2">
                  <Label>Shared With</Label>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2 pr-4">
                      {existingRecipients.map((recipient) => (
                        <div
                          key={recipient.id}
                          className="p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {recipient.name || recipient.email}
                              </p>
                              {recipient.name && (
                                <p className="text-xs text-muted-foreground">{recipient.email}</p>
                              )}
                              <div className="flex gap-1 mt-1">
                                {recipient.permissions.map((perm) => (
                                  <Badge key={perm} variant="outline" className="h-5 text-xs">
                                    {perm}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {recipient.accessedAt && (
                              <Badge variant="secondary" className="text-xs">
                                Accessed
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
