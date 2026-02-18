import { useToast } from '@/hooks/use-toast';

export function useMarketingRequestActions() {
  const { toast } = useToast();

  const approveMarketingRequest = async (_requestId: string) => {
    toast({
      title: 'Not Available',
      description: 'Marketing requests are not available in single-tenant mode.',
      variant: 'destructive',
    });
  };

  const declineMarketingRequest = async (_requestId: string, _reason: string) => {
    toast({
      title: 'Not Available',
      description: 'Marketing requests are not available in single-tenant mode.',
      variant: 'destructive',
    });
  };

  return {
    approveMarketingRequest,
    declineMarketingRequest,
  };
}
