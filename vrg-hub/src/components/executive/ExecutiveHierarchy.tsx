import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Building2, User, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { HierarchyRow } from "@/hooks/useExecutiveDashboard";

interface ExecutiveHierarchyProps {
  worksiteData?: HierarchyRow[];
  radiologistData?: HierarchyRow[];
  isLoading?: boolean;
}

interface TreeNode {
  name: string;
  revenue: number;
  study_count: number;
  children?: TreeNode[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function buildWorksiteTree(data: HierarchyRow[]): TreeNode[] {
  const worksiteMap = new Map<string, { radiologists: Map<string, { modalities: Map<string, { revenue: number; count: number }> }> }>();
  
  data.forEach(row => {
    const ws = row.WorkSiteName;
    const rad = row.RadiologistName;
    const mod = row.Modality;
    const rev = Number(row.revenue);
    const cnt = Number(row.study_count);
    
    if (!worksiteMap.has(ws)) {
      worksiteMap.set(ws, { radiologists: new Map() });
    }
    const wsData = worksiteMap.get(ws)!;
    
    if (!wsData.radiologists.has(rad)) {
      wsData.radiologists.set(rad, { modalities: new Map() });
    }
    const radData = wsData.radiologists.get(rad)!;
    
    radData.modalities.set(mod, { revenue: rev, count: cnt });
  });
  
  const result: TreeNode[] = [];
  worksiteMap.forEach((wsData, wsName) => {
    const radChildren: TreeNode[] = [];
    let wsRevenue = 0;
    let wsCount = 0;
    
    wsData.radiologists.forEach((radData, radName) => {
      const modChildren: TreeNode[] = [];
      let radRevenue = 0;
      let radCount = 0;
      
      radData.modalities.forEach((modData, modName) => {
        modChildren.push({ name: modName, revenue: modData.revenue, study_count: modData.count });
        radRevenue += modData.revenue;
        radCount += modData.count;
      });
      
      radChildren.push({ name: radName, revenue: radRevenue, study_count: radCount, children: modChildren });
      wsRevenue += radRevenue;
      wsCount += radCount;
    });
    
    result.push({ name: wsName, revenue: wsRevenue, study_count: wsCount, children: radChildren });
  });
  
  return result.sort((a, b) => b.revenue - a.revenue);
}

function buildRadiologistTree(data: HierarchyRow[]): TreeNode[] {
  const radMap = new Map<string, { worksites: Map<string, { modalities: Map<string, { revenue: number; count: number }> }> }>();
  
  data.forEach(row => {
    const rad = row.RadiologistName;
    const ws = row.WorkSiteName;
    const mod = row.Modality;
    const rev = Number(row.revenue);
    const cnt = Number(row.study_count);
    
    if (!radMap.has(rad)) {
      radMap.set(rad, { worksites: new Map() });
    }
    const radData = radMap.get(rad)!;
    
    if (!radData.worksites.has(ws)) {
      radData.worksites.set(ws, { modalities: new Map() });
    }
    const wsData = radData.worksites.get(ws)!;
    
    wsData.modalities.set(mod, { revenue: rev, count: cnt });
  });
  
  const result: TreeNode[] = [];
  radMap.forEach((radData, radName) => {
    const wsChildren: TreeNode[] = [];
    let radRevenue = 0;
    let radCount = 0;
    
    radData.worksites.forEach((wsData, wsName) => {
      const modChildren: TreeNode[] = [];
      let wsRevenue = 0;
      let wsCount = 0;
      
      wsData.modalities.forEach((modData, modName) => {
        modChildren.push({ name: modName, revenue: modData.revenue, study_count: modData.count });
        wsRevenue += modData.revenue;
        wsCount += modData.count;
      });
      
      wsChildren.push({ name: wsName, revenue: wsRevenue, study_count: wsCount, children: modChildren });
      radRevenue += wsRevenue;
      radCount += wsCount;
    });
    
    result.push({ name: radName, revenue: radRevenue, study_count: radCount, children: wsChildren });
  });
  
  return result.sort((a, b) => b.revenue - a.revenue);
}

function TreeRow({ node, depth = 0, icon: Icon }: { node: TreeNode; depth?: number; icon?: React.ElementType }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  
  const depthIcons = [Building2, User, Activity];
  const NodeIcon = Icon || depthIcons[depth] || Activity;
  
  return (
    <div>
      <div 
        className={cn(
          "flex items-center py-2 px-3 hover:bg-muted/60 rounded-lg transition-colors cursor-pointer border border-transparent",
          depth === 0 && "bg-muted/30 border-border/60"
        )}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <Button variant="ghost" size="icon" className="h-5 w-5 mr-2 p-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <span className="w-7" />
        )}
        <NodeIcon className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className="flex-1 font-medium text-sm truncate">{node.name}</span>
        <span className="text-sm text-muted-foreground mr-4">{node.study_count.toLocaleString()} studies</span>
        <span className="text-sm font-semibold text-primary">{formatCurrency(node.revenue)}</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.slice(0, 20).map((child, i) => (
            <TreeRow key={`${child.name}-${i}`} node={child} depth={depth + 1} />
          ))}
          {node.children!.length > 20 && (
            <div className="text-sm text-muted-foreground py-2" style={{ paddingLeft: `${(depth + 1) * 24 + 40}px` }}>
              +{node.children!.length - 20} more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExecutiveHierarchy({ worksiteData, radiologistData, isLoading }: ExecutiveHierarchyProps) {
  const worksiteTree = useMemo(() => worksiteData ? buildWorksiteTree(worksiteData) : [], [worksiteData]);
  const radiologistTree = useMemo(() => radiologistData ? buildRadiologistTree(radiologistData) : [], [radiologistData]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Hierarchy Explorer</CardTitle>
        <CardDescription>Trace revenue and study volume through sites, radiologists, and modalities.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="worksite">
          <TabsList className="mb-4 bg-muted/40">
            <TabsTrigger value="worksite">
              <Building2 className="h-4 w-4 mr-2" />
              Worksite → Radiologist → Modality
            </TabsTrigger>
            <TabsTrigger value="radiologist">
              <User className="h-4 w-4 mr-2" />
              Radiologist → Worksite → Modality
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="worksite">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="max-h-[500px] overflow-auto rounded-xl border border-border/50 bg-background/70 p-2">
                {worksiteTree.slice(0, 30).map((node, i) => (
                  <TreeRow key={`${node.name}-${i}`} node={node} icon={Building2} />
                ))}
                {worksiteTree.length > 30 && (
                  <div className="text-xs text-muted-foreground py-3 text-center">
                    Showing top 30 of {worksiteTree.length} worksites
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="radiologist">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="max-h-[500px] overflow-auto rounded-xl border border-border/50 bg-background/70 p-2">
                {radiologistTree.slice(0, 30).map((node, i) => (
                  <TreeRow key={`${node.name}-${i}`} node={node} icon={User} />
                ))}
                {radiologistTree.length > 30 && (
                  <div className="text-xs text-muted-foreground py-3 text-center">
                    Showing top 30 of {radiologistTree.length} radiologists
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
