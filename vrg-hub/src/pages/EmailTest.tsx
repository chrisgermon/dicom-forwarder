import { EmailSystemTest } from '@/components/requests/EmailSystemTest';

export default function EmailTest() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email System Testing</h1>
          <p className="text-muted-foreground mt-2">
            Test the complete email notification and reply system
          </p>
        </div>

        <EmailSystemTest />
      </div>
    </div>
  );
}