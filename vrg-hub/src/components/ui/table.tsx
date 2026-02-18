import * as React from "react";

import { cn } from "@/lib/utils";

interface ColumnWidths {
  [key: string]: number;
}

interface TableContextType {
  columnWidths: ColumnWidths;
  setColumnWidth: (columnId: string, width: number) => void;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
  resizable: boolean;
}

const TableContext = React.createContext<TableContextType | undefined>(undefined);

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  resizable?: boolean;
  storageKey?: string;
  defaultColumnWidths?: ColumnWidths;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, resizable = true, storageKey, defaultColumnWidths = {}, children, ...props }, ref) => {
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
      <TableContext.Provider value={{ columnWidths, setColumnWidth, isResizing, setIsResizing, resizable }}>
        <div className="relative w-full overflow-auto">
          <table 
            ref={ref} 
            className={cn(
              "w-full caption-bottom text-sm",
              isResizing && "select-none",
              className
            )} 
            {...props}
          >
            {children}
          </table>
        </div>
      </TableContext.Provider>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-border/50", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t border-border/50 bg-muted/30 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b border-border/50 transition-colors data-[state=selected]:bg-accent/5 hover:bg-accent/5", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnId?: string;
  minWidth?: number;
  maxWidth?: number;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, columnId, minWidth = 60, maxWidth = 600, children, ...props }, ref) => {
    const context = React.useContext(TableContext);
    const [isResizingThis, setIsResizingThis] = React.useState(false);
    const headerRef = React.useRef<HTMLTableCellElement>(null);
    const startXRef = React.useRef<number>(0);
    const startWidthRef = React.useRef<number>(0);

    // Combine refs
    React.useImperativeHandle(ref, () => headerRef.current!);

    const resizable = context?.resizable && columnId;
    const width = columnId ? context?.columnWidths[columnId] : undefined;

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!resizable || !context) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      setIsResizingThis(true);
      context.setIsResizing(true);
      startXRef.current = e.clientX;
      
      const currentWidth = headerRef.current?.offsetWidth || minWidth;
      startWidthRef.current = currentWidth;

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    React.useEffect(() => {
      if (!isResizingThis || !context || !columnId) return;

      const handleMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startXRef.current;
        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + diff));
        context.setColumnWidth(columnId, newWidth);
      };

      const handleMouseUp = () => {
        setIsResizingThis(false);
        context.setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isResizingThis, columnId, context, minWidth, maxWidth]);

    return (
      <th
        ref={headerRef}
        className={cn(
          "h-12 px-4 py-3 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide [&:has([role=checkbox])]:pr-0",
          resizable && "relative group",
          className,
        )}
        style={width ? { width: `${width}px`, minWidth: `${width}px` } : undefined}
        {...props}
      >
        {resizable ? (
          <>
            <div className="flex items-center">{children}</div>
            <div
              className={cn(
                "absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-primary/30 transition-opacity",
                isResizingThis && "opacity-100 bg-primary/40"
              )}
              onMouseDown={handleMouseDown}
            >
              <div className="absolute right-0 top-0 h-full w-px bg-border" />
            </div>
          </>
        ) : (
          children
        )}
      </th>
    );
  },
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-4 py-4 align-middle text-sm [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
