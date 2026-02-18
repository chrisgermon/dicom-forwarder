import { MarketingCalendarView } from '@/components/marketing/MarketingCalendarView';
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function MarketingCalendar() {
  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Marketing Calendar"
        description="View scheduled Notifyre fax campaigns and Mailchimp email campaigns"
      />
      <MarketingCalendarView />
    </PageContainer>
  );
}
