import { useState } from "react";
import { format } from "date-fns";
import { Plus, Search, Mail, Phone, Star, MoreHorizontal, Edit, Trash, MessageSquare, Users } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMloContacts, useAllMloContacts, useDeleteMloContact, type MloContact } from "@/hooks/useMloCrm";
import { useMloRole } from "@/hooks/useMloRole";
import { MloContactForm } from "@/components/mlo/MloContactForm";
import { MloCommunicationForm } from "@/components/mlo/MloCommunicationForm";

const CONTACT_TYPE_LABELS: Record<string, string> = {
  clinic: 'Clinic',
  referrer: 'Referrer',
  practice_manager: 'Practice Manager',
  other: 'Other',
};

export default function MloContacts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<MloContact | null>(null);
  const [logCommunicationFor, setLogCommunicationFor] = useState<MloContact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { isMloManager, isLoading: isRoleLoading } = useMloRole();
  const { data: ownContacts, isLoading: isOwnLoading } = useMloContacts();
  const { data: allContacts, isLoading: isAllLoading } = useAllMloContacts();
  const deleteContact = useDeleteMloContact();

  const contacts = isMloManager ? allContacts : ownContacts;
  const isLoading = isRoleLoading || (isMloManager ? isAllLoading : isOwnLoading);

  const filteredContacts = contacts?.filter((contact) => {
    if (typeFilter !== 'all' && contact.contact_type !== typeFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const fullName = `${contact.first_name} ${contact.last_name || ''}`.toLowerCase();
      if (
        !fullName.includes(search) &&
        !contact.email?.toLowerCase().includes(search) &&
        !contact.phone?.toLowerCase().includes(search) &&
        !contact.title?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      await deleteContact.mutateAsync(id);
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Contacts" 
        description="Manage your clinic and referrer contacts"
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <MloContactForm onSuccess={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="clinic">Clinic</SelectItem>
                <SelectItem value="referrer">Referrer</SelectItem>
                <SelectItem value="practice_manager">Practice Manager</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Last Contacted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-3 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !filteredContacts?.length ? (
            <EmptyState
              icon={<Users />}
              title="No contacts found"
              description={searchTerm || typeFilter !== 'all'
                ? "Try adjusting your search or filters."
                : "Add your first contact to start building your network."}
              action={!searchTerm && typeFilter === 'all' ? {
                label: "Add Contact",
                onClick: () => setIsAddDialogOpen(true),
                icon: <Plus className="h-4 w-4" />,
              } : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Last Contacted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {contact.is_key_decision_maker && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <span className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CONTACT_TYPE_LABELS[contact.contact_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{contact.title || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${contact.email}`} className="hover:underline">
                              {contact.email}
                            </a>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <a href={`tel:${contact.phone}`} className="hover:underline">
                              {contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.last_contacted_at 
                        ? format(new Date(contact.last_contacted_at), 'dd MMM yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLogCommunicationFor(contact)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Log Communication
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingContact(contact)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(contact.id)}
                            className="text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <MloContactForm 
              contact={editingContact} 
              onSuccess={() => setEditingContact(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Log Communication Dialog */}
      <Dialog open={!!logCommunicationFor} onOpenChange={(open) => !open && setLogCommunicationFor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Communication with {logCommunicationFor?.first_name}</DialogTitle>
          </DialogHeader>
          {logCommunicationFor && (
            <MloCommunicationForm 
              contactId={logCommunicationFor.id}
              onSuccess={() => setLogCommunicationFor(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
