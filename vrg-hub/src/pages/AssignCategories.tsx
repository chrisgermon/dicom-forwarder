import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/ui/page-container';
import { Sparkles, Loader2 } from 'lucide-react';
import { assignCategoriesAndIcons } from '@/scripts/assignCategoriesAndIcons';
import { useToast } from '@/hooks/use-toast';

export default function AssignCategories() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleAssign = async () => {
    setIsProcessing(true);
    
    try {
      await assignCategoriesAndIcons();
      
      toast({
        title: 'Success!',
        description: 'Categories have been assigned and icons generated using AI',
      });
    } catch (error) {
      console.error('Error assigning categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign categories. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer maxWidth="md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI-Powered Category Assignment
          </CardTitle>
          <CardDescription>
            Automatically match form templates to request types and generate icons using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">What this will do:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Analyze all unlinked form templates</li>
              <li>Smart-match templates to appropriate request types</li>
              <li>Generate AI-suggested Lucide icons for each category</li>
              <li>Update existing categories with new icons</li>
              <li>Create new categories where needed</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleAssign} 
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing... Check console for progress
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Assign Categories & Generate Icons
              </>
            )}
          </Button>
          
          {isProcessing && (
            <p className="text-sm text-muted-foreground text-center">
              This may take a minute. Please wait...
            </p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
