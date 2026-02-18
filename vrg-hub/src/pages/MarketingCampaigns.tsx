import * as React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs";
import { Button } from "@/components/ui/button";
import { Mail, FileText, FileBarChart } from "lucide-react";
import { MailchimpCampaignsTab } from "@/components/marketing/MailchimpCampaignsTab";
import { NotifyreFaxCampaigns } from "@/components/notifyre/NotifyreFaxCampaigns";
import { CampaignReportGenerator } from "@/components/marketing/CampaignReportGenerator";
import { ScheduledReportsManager } from "@/components/marketing/ScheduledReportsManager";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

const MarketingCampaigns = () => {
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false);

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Marketing Campaigns"
        description="View and analyze your email and fax campaign performance"
        actions={
          <Button onClick={() => setReportDialogOpen(true)}>
            <FileBarChart className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        }
      />

      <ScheduledReportsManager />

      <UnderlineTabs defaultValue="email" className="w-full">
        <UnderlineTabsList>
          <UnderlineTabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Campaigns
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="fax" className="gap-2">
            <FileText className="h-4 w-4" />
            Fax Campaigns
          </UnderlineTabsTrigger>
        </UnderlineTabsList>
        
        <TabsContent value="email" className="mt-6">
          <MailchimpCampaignsTab />
        </TabsContent>
        
        <TabsContent value="fax" className="mt-6">
          <NotifyreFaxCampaigns />
        </TabsContent>
      </UnderlineTabs>

      <CampaignReportGenerator 
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />
    </PageContainer>
  );
};

export default MarketingCampaigns;