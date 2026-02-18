import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, User } from 'lucide-react';
import { Contact } from '@/types/directory';

interface ContactCardProps {
  contact: Contact;
}

export function ContactCard({ contact }: ContactCardProps) {
  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold truncate">{contact.name}</CardTitle>
            <p className="text-sm text-muted-foreground truncate">{contact.title}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {contact.contact_type && (
          <Badge variant="secondary" className="text-xs capitalize">
            {contact.contact_type}
          </Badge>
        )}
        
        {contact.phone && (
          <a 
            href={`tel:${contact.phone.replace(/\s/g, '')}`} 
            className="flex items-center gap-2.5 text-sm group"
          >
            <Phone className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground group-hover:text-primary transition-colors">
              {contact.phone}
            </span>
          </a>
        )}
        
        {contact.email && (
          <a 
            href={`mailto:${contact.email}`} 
            className="flex items-center gap-2.5 text-sm group"
          >
            <Mail className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground group-hover:text-primary transition-colors truncate">
              {contact.email}
            </span>
          </a>
        )}
        
        {!contact.phone && !contact.email && (
          <p className="text-sm text-muted-foreground italic">No contact details</p>
        )}
      </CardContent>
    </Card>
  );
}
