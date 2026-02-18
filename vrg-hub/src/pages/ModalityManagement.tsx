import { ModalityDetails } from '@/components/modality/ModalityDetails';
import { ServerAnalytics } from '@/components/modality/ServerAnalytics';
import { TabsContent } from '@/components/ui/tabs';
import { PageContainer } from '@/components/ui/page-container';
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from '@/components/ui/underline-tabs';
import { Monitor, BarChart3 } from 'lucide-react';

const ModalityManagement = () => {
  return (
    <PageContainer maxWidth="xl">
      <UnderlineTabs defaultValue="modalities">
        <UnderlineTabsList>
          <UnderlineTabsTrigger value="modalities">
            <Monitor className="w-4 h-4 mr-2" />
            Modalities & Sites
          </UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="servers">
            <BarChart3 className="w-4 h-4 mr-2" />
            Server Analytics
          </UnderlineTabsTrigger>
        </UnderlineTabsList>

        <TabsContent value="modalities" className="mt-6">
          <ModalityDetails />
        </TabsContent>

        <TabsContent value="servers" className="mt-6">
          <ServerAnalytics />
        </TabsContent>
      </UnderlineTabs>
    </PageContainer>
  );
};

export default ModalityManagement;
