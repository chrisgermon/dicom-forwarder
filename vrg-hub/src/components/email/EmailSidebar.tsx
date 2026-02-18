import { useMailFolders, useUnreadCount } from "@/hooks/useOutlookMail";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  Inbox, 
  Send, 
  FileText, 
  Trash2, 
  Archive,
  AlertCircle,
  Folder,
  Loader2,
  Mail
} from "lucide-react";

interface EmailSidebarProps {
  selectedFolder: string;
  onSelectFolder: (folderId: string) => void;
}

const folderIcons: Record<string, React.ElementType> = {
  inbox: Inbox,
  sentitems: Send,
  drafts: FileText,
  deleteditems: Trash2,
  archive: Archive,
  junkemail: AlertCircle,
};

const defaultFolders = [
  { id: "inbox", displayName: "Inbox" },
  { id: "sentitems", displayName: "Sent Items" },
  { id: "drafts", displayName: "Drafts" },
  { id: "deleteditems", displayName: "Deleted Items" },
  { id: "junkemail", displayName: "Junk Email" },
  { id: "archive", displayName: "Archive" },
];

export function EmailSidebar({ selectedFolder, onSelectFolder }: EmailSidebarProps) {
  const { data: folders, isLoading } = useMailFolders();
  const { data: unreadData } = useUnreadCount();

  const getFolderIcon = (folderId: string) => {
    const normalizedId = folderId.toLowerCase().replace(/\s/g, '');
    return folderIcons[normalizedId] || Folder;
  };

  const getUnreadCount = (folderId: string) => {
    if (folderId === "inbox" && unreadData) {
      return unreadData.unreadCount;
    }
    const folder = folders?.find(f => f.id === folderId);
    return folder?.unreadItemCount || 0;
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Mail</h2>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Default folders */}
              {defaultFolders.map((folder) => {
                const Icon = getFolderIcon(folder.id);
                const unread = getUnreadCount(folder.id);
                const isSelected = selectedFolder === folder.id;

                return (
                  <button
                    key={folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{folder.displayName}</span>
                    {unread > 0 && (
                      <span className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded-full",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                      )}>
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Custom folders */}
              {folders && folders.filter(f => 
                !defaultFolders.some(df => df.id.toLowerCase() === f.displayName.toLowerCase().replace(/\s/g, ''))
              ).length > 0 && (
                <>
                  <div className="pt-3 pb-1 px-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Folders
                    </span>
                  </div>
                  {folders
                    .filter(f => !defaultFolders.some(df => 
                      df.id.toLowerCase() === f.displayName.toLowerCase().replace(/\s/g, '')
                    ))
                    .map((folder) => {
                      const isSelected = selectedFolder === folder.id;
                      return (
                        <button
                          key={folder.id}
                          onClick={() => onSelectFolder(folder.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            isSelected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <Folder className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1 text-left truncate">{folder.displayName}</span>
                          {folder.unreadItemCount > 0 && (
                            <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              {folder.unreadItemCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
