import { SimpleTicketForm } from '@/components/requests/SimpleTicketForm';
import { PermissionGuard } from '@/components/PermissionGuard';

export default function NewTicket() {
  return (
    <PermissionGuard permission="create_ticket_request">
      <div className="container max-w-4xl py-8">
        <SimpleTicketForm />
      </div>
    </PermissionGuard>
  );
}
