import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderRow, FileRow } from "./SharePointTableRow";

interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
  lastModifiedDateTime: string;
  path?: string;
}

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  lastModifiedDateTime: string;
  lastModifiedBy?: string;
  fileType: string;
  downloadUrl?: string;
  path?: string;
}

interface VirtualizedTableProps {
  folders: SharePointFolder[];
  files: SharePointFile[];
  onFolderNavigate: (name: string, path?: string) => void;
  isSearchResult: boolean;
  currentPath: string;
  loading: boolean;
}

export function VirtualizedTable({ 
  folders, 
  files, 
  onFolderNavigate, 
  isSearchResult, 
  currentPath,
  loading 
}: VirtualizedTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Combine folders and files for virtualization
  const allItems = [
    ...folders.map(f => ({ type: 'folder' as const, data: f })),
    ...files.map(f => ({ type: 'file' as const, data: f })),
  ];

  const rowVirtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, // Approximate row height
    overscan: 10, // Render 10 extra items above and below viewport
  });

  return (
    <div
      ref={parentRef}
      style={{
        height: '600px',
        overflow: 'auto',
        contain: 'strict',
      }}
    >
      <Table>
        <TableHeader style={{ position: 'sticky', top: 0, zIndex: 1, background: 'hsl(var(--background))' }}>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead className="w-10"></TableHead>
            <TableHead>Name</TableHead>
            {isSearchResult && <TableHead className="hidden lg:table-cell">Location</TableHead>}
            <TableHead className="hidden md:table-cell w-44">Modified</TableHead>
            <TableHead className="hidden lg:table-cell w-32">Modified By</TableHead>
            <TableHead className="hidden sm:table-cell w-20">Size</TableHead>
            <TableHead className="w-28">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = allItems[virtualRow.index];
            
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {item.type === 'folder' ? (
                  <FolderRow
                    folder={item.data}
                    onNavigate={onFolderNavigate}
                    isSearchResult={isSearchResult}
                    currentPath={currentPath}
                    loading={loading}
                  />
                ) : (
                  <FileRow
                    file={item.data}
                    isSearchResult={isSearchResult}
                    currentPath={currentPath}
                  />
                )}
              </div>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
