import * as React from "react";
import { cn } from "@/lib/utils";

interface ColumnWidths {
  [key: string]: number;
}

interface ResizableTableContextType {
  columnWidths: ColumnWidths;
  setColumnWidth: (columnId: string, width: number) => void;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
}

const ResizableTableContext = React.createContext<ResizableTableContextType | undefined>(undefined);

interface ResizableTableProps extends React.HTMLAttributes<HTMLTableElement> {
  storageKey?: string;
  defaultColumnWidths?: ColumnWidths;
}

export function ResizableTable({ 
  className, 
  storageKey, 
  defaultColumnWidths = {},
  children,
  ...props 
}: ResizableTableProps) {
  const [columnWidths, setColumnWidthsState] = React.useState<ColumnWidths>(() => {
    if (storageKey) {
      const stored = localStorage.getItem(`table-widths-${storageKey}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return defaultColumnWidths;
        }
      }
    }
    return defaultColumnWidths;
  });

  const [isResizing, setIsResizing] = React.useState(false);

  const setColumnWidth = React.useCallback((columnId: string, width: number) => {
    setColumnWidthsState(prev => {
      const newWidths = { ...prev, [columnId]: width };
      if (storageKey) {
        localStorage.setItem(`table-widths-${storageKey}`, JSON.stringify(newWidths));
      }
      return newWidths;
    });
  }, [storageKey]);

  return (
    <ResizableTableContext.Provider value={{ columnWidths, setColumnWidth, isResizing, setIsResizing }}>
      <table className={cn("w-full caption-bottom text-sm table-fixed", className)} {...props}>
        {children}
      </table>
    </ResizableTableContext.Provider>
  );
}

export function ResizableTableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="[&_tr]:border-b" {...props} />;
}

export function ResizableTableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}

export function ResizableTableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
      {...props}
    />
  );
}

interface ResizableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnId: string;
  minWidth?: number;
  maxWidth?: number;
}

export function ResizableTableHead({
  className,
  columnId,
  minWidth = 100,
  maxWidth = 800,
  children,
  ...props
}: ResizableTableHeadProps) {
  const context = React.useContext(ResizableTableContext);
  const [isResizingThis, setIsResizingThis] = React.useState(false);
  const headerRef = React.useRef<HTMLTableCellElement>(null);
  const startXRef = React.useRef<number>(0);
  const startWidthRef = React.useRef<number>(0);

  if (!context) {
    throw new Error("ResizableTableHead must be used within ResizableTable");
  }

  const { columnWidths, setColumnWidth, setIsResizing } = context;
  const width = columnWidths[columnId];

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizingThis(true);
    setIsResizing(true);
    startXRef.current = e.clientX;
    
    const currentWidth = headerRef.current?.offsetWidth || minWidth;
    startWidthRef.current = currentWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  React.useEffect(() => {
    if (!isResizingThis) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + diff));
      setColumnWidth(columnId, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingThis(false);
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingThis, columnId, setColumnWidth, setIsResizing, minWidth, maxWidth]);

  return (
    <th
      ref={headerRef}
      className={cn(
        "h-11 px-4 py-2.5 text-left align-middle font-medium text-muted-foreground text-sm [&:has([role=checkbox])]:pr-0 relative group",
        className
      )}
      style={width ? { width: `${width}px`, minWidth: `${width}px` } : undefined}
      {...props}
    >
      <div className="flex items-center justify-between">
        {children}
      </div>
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-2 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity z-10",
          isResizingThis && "opacity-100"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className={cn(
          "absolute right-0 top-1 bottom-1 w-1 rounded-full bg-primary/30 transition-colors",
          isResizingThis && "bg-primary/60"
        )} />
      </div>
    </th>
  );
}

export function ResizableTableCell(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-2.5 align-middle text-sm [&:has([role=checkbox])]:pr-0", props.className)}
      {...props}
    />
  );
}

export function ResizableTableCaption(props: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption className="mt-4 text-sm text-muted-foreground" {...props} />
  );
}
