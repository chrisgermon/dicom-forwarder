import { SharePointBrowser } from "@/components/documentation/SharePointBrowser";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function Documentation() {
  return (
    <PageContainer maxWidth="2xl">
      <PageHeader
        title="File Directory"
        description="Browse and manage your files from SharePoint"
      />
      <SharePointBrowser />
    </PageContainer>
  );
}
