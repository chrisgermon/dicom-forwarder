import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Settings } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SharePointFile {
  id: string;
  name: string;
  url: string;
  lastModified?: string;
  size?: string;
}

interface SharePointFilesModuleProps {
  title?: string;
  folderPath?: string;
  files?: SharePointFile[];
  isEditing?: boolean;
  onUpdate?: (folderPath: string) => void;
}

export function SharePointFilesModule({ 
  title = "Recent Documents", 
  folderPath = "",
  files = [],
  isEditing = false,
  onUpdate
}: SharePointFilesModuleProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [currentFolderPath, setCurrentFolderPath] = useState(folderPath);

  const handleSaveConfig = () => {
    onUpdate?.(currentFolderPath);
    setIsConfigOpen(false);
  };

  // Use provided files only; show empty state if none
  const displayFiles = files;

  return (
    <>
      <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
          {isEditing && (
            <Button onClick={() => setIsConfigOpen(true)} size="sm" variant="outline">
              <Settings className="h-4 w-4 mr-1" />
              Configure
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {displayFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No documents yet</p>
            ) : (
              displayFiles.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between p-3 rounded-xl border hover:bg-accent/50 hover:border-accent transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      {(file.lastModified || file.size) && (
                        <p className="text-xs text-muted-foreground">
                          {file.lastModified || ""}{file.lastModified && file.size ? " · " : ""}{file.size || ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure SharePoint Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderPath">SharePoint Folder Path</Label>
              <Input
                id="folderPath"
                value={currentFolderPath}
                onChange={(e) => setCurrentFolderPath(e.target.value)}
                placeholder="/sites/YourSite/Shared Documents/Folder"
              />
              <p className="text-xs text-muted-foreground">
                Enter the SharePoint folder path to display recent files
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
