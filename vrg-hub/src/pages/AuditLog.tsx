import { AuditLogViewer } from '@/components/AuditLogViewer';
import { SystemEmailLogs } from '@/components/SystemEmailLogs';
import { MailgunLogs } from '@/components/MailgunLogs';
import { TabsContent } from '@/components/ui/tabs';
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from '@/components/ui/underline-tabs';
import { PageContainer } from '@/components/ui/page-container';
import { FileText, Mail, Send } from 'lucide-react';

export default function AuditLog() {
  return (
    <PageContainer maxWidth="xl">
      <UnderlineTabs defaultValue="audit" className="w-full">
        <UnderlineTabsList>
          <UnderlineTabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Audit Logs
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Logs
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="mailgun" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Mailgun Logs
          </UnderlineTabsTrigger>
        </UnderlineTabsList>
        <TabsContent value="audit" className="mt-6">
          <AuditLogViewer />
        </TabsContent>
        <TabsContent value="emails" className="mt-6">
          <SystemEmailLogs />
        </TabsContent>
        <TabsContent value="mailgun" className="mt-6">
          <MailgunLogs />
        </TabsContent>
      </UnderlineTabs>
    </PageContainer>
  );
}