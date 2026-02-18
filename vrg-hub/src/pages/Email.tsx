import { useState } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { useHasOffice365Connection } from "@/hooks/useMloCalendarSync";
import { ConnectCalendarButton } from "@/components/mlo/ConnectCalendarButton";
import { EmailSidebar } from "@/components/email/EmailSidebar";
import { EmailList } from "@/components/email/EmailList";
import { EmailReader } from "@/components/email/EmailReader";
import { Card } from "@/components/ui/card";
import { Mail, Loader2 } from "lucide-react";

export default function Email() {
  const { data: isConnected, isLoading: connectionLoading } = useHasOffice365Connection();
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  if (connectionLoading) {
    return (
      <PageContainer maxWidth="2xl">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (!isConnected) {
    return (
      <PageContainer maxWidth="lg">
        <Card className="p-8 text-center">
          <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Connect Your Email</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your Office 365 account to view and manage your emails directly within the intranet.
          </p>
          <ConnectCalendarButton />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="2xl" className="h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-4">
        <div className="w-56 flex-shrink-0">
          <EmailSidebar
            selectedFolder={selectedFolder}
            onSelectFolder={(folder) => {
              setSelectedFolder(folder);
              setSelectedMessageId(null);
            }}
          />
        </div>
        <div className="w-96 flex-shrink-0">
          <EmailList
            folderId={selectedFolder}
            selectedMessageId={selectedMessageId}
            onSelectMessage={setSelectedMessageId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        <div className="flex-1 min-w-0">
          <EmailReader messageId={selectedMessageId} />
        </div>
      </div>
    </PageContainer>
  );
}
