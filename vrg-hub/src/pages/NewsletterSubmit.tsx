import { useAuth } from "@/hooks/useAuth";
import { ContributorDashboard } from "@/components/newsletter/ContributorDashboard";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function NewsletterSubmit() {
  const { user } = useAuth();

  if (!user) {
    return (
      <PageContainer maxWidth="xl" className="space-y-6">
        <PageHeader
          title="Newsletter Submission"
          description="Please sign in to submit newsletter content"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Newsletter Submission"
        description="Submit your monthly newsletter content"
      />
      <ContributorDashboard />
    </PageContainer>
  );
}
