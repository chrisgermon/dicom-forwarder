import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Settings, Pencil, X } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger } from '@/components/ui/underline-tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDirectory } from '@/hooks/useDirectory';
import DirectoryEditor from '@/components/directory/DirectoryEditor';
import { InlineClinicEditor } from '@/components/directory/InlineClinicEditor';
import { InlineContactEditor } from '@/components/directory/InlineContactEditor';
import { QuickAddPanel } from '@/components/directory/QuickAddPanel';
import { Brand, Clinic, Contact } from '@/types/directory';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CompanyDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ type: 'clinic' | 'contact'; id: string; name: string } | null>(null);
  const { userRole } = useAuth();
  const isAdmin = userRole === 'tenant_admin' || userRole === 'super_admin';

  const { categories, clinics, contacts, isLoading, fetchData } = useDirectory(selectedBrand);

  useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, display_name, logo_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (data && !error) {
        setBrands(data);
        if (data.length > 0) setSelectedBrand(data[0].id);
      }
      setIsLoadingBrands(false);
    };

    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchData();
    }
  }, [selectedBrand, fetchData]);

  // Exit edit mode when brand changes
  useEffect(() => {
    setEditMode(false);
    setEditingId(null);
  }, [selectedBrand]);

  const saveClinic = useCallback(async (clinic: Clinic) => {
    try {
      const clinicData = { 
        ...clinic, 
        extensions: clinic.extensions as any,
        region: clinic.region || 'melbourne'
      };
      const { error } = clinic.id
        ? await supabase.from('directory_clinics').update(clinicData).eq('id', clinic.id)
        : await supabase.from('directory_clinics').insert([clinicData]);

      if (error) throw error;
      
      toast.success(clinic.id ? 'Clinic updated' : 'Clinic added');
      fetchData();
      setEditingId(null);
    } catch (error) {
      console.error('Error saving clinic:', error);
      toast.error('Failed to save clinic');
    }
  }, [fetchData]);

  const saveContact = useCallback(async (contact: Contact) => {
    try {
      const contactData = {
        ...contact,
        contact_type: contact.contact_type || 'admin'
      };
      const { error } = contact.id
        ? await supabase.from('directory_contacts').update(contactData).eq('id', contact.id)
        : await supabase.from('directory_contacts').insert([contactData]);

      if (error) throw error;
      
      toast.success(contact.id ? 'Contact updated' : 'Contact added');
      fetchData();
      setEditingId(null);
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    }
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteItem) return;
    
    const table = deleteItem.type === 'clinic' ? 'directory_clinics' : 'directory_contacts';
    const { error } = await supabase.from(table).delete().eq('id', deleteItem.id);
    
    if (error) {
      toast.error(`Failed to delete ${deleteItem.type}`);
    } else {
      toast.success(`${deleteItem.type.charAt(0).toUpperCase() + deleteItem.type.slice(1)} deleted`);
      fetchData();
    }
    setDeleteItem(null);
    setEditingId(null);
  };

  const getClinicsByCategory = (categoryId: string) => {
    return clinics.filter(c => c.category_id === categoryId);
  };

  const getContactsByCategory = (categoryId: string) => {
    return contacts.filter(c => c.category_id === categoryId);
  };

  const filterClinics = (clinics: Clinic[]) => {
    if (!searchQuery.trim()) return clinics;
    
    const query = searchQuery.toLowerCase();
    return clinics.filter(clinic => 
      clinic.name.toLowerCase().includes(query) ||
      clinic.address.toLowerCase().includes(query) ||
      clinic.phone.includes(query) ||
      clinic.extensions.some(ext => 
        ext.name.toLowerCase().includes(query) ||
        ext.number.includes(query)
      )
    );
  };

  const filterContacts = (contacts: Contact[]) => {
    if (!searchQuery.trim()) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.title.toLowerCase().includes(query) ||
      contact.phone?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query)
    );
  };

  const clinicCategories = categories.filter(c => c.category_type === 'clinic');
  const contactCategories = categories.filter(c => c.category_type === 'contact');
  const defaultTab = categories.length > 0 ? categories[0].id : '';

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Phone Directory"
        description="Select a brand to view their contact directory"
        actions={
          isAdmin && (
            <div className="flex gap-2">
              {categories.length > 0 && (
                <Button 
                  variant={editMode ? "secondary" : "outline"}
                  onClick={() => {
                    setEditMode(!editMode);
                    setEditingId(null);
                  }}
                  className="gap-2"
                >
                  {editMode ? (
                    <>
                      <X className="h-4 w-4" />
                      Exit Edit Mode
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4" />
                      Edit Inline
                    </>
                  )}
                </Button>
              )}
              <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Directory
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Directory Editor</DialogTitle>
                  </DialogHeader>
                  <DirectoryEditor />
                </DialogContent>
              </Dialog>
            </div>
          )
        }
      />

      {/* Edit Mode Banner */}
      {editMode && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/20 text-primary">Edit Mode</Badge>
            <span className="text-sm text-muted-foreground">
              Click any card to edit • Press Esc to cancel • ⌘+Enter to save
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
            Done Editing
          </Button>
        </div>
      )}

      {/* Company Logo Selector */}
      <div className="flex flex-wrap items-center gap-4 pb-4 border-b">
        {isLoadingBrands ? (
          <div className="text-sm text-muted-foreground">Loading brands...</div>
        ) : (
          brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrand(brand.id)}
              className={cn(
                "p-4 rounded-lg border-2 transition-all hover:shadow-md w-40 h-28 flex items-center justify-center",
                selectedBrand === brand.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              title={brand.display_name}
            >
              <img
                src={brand.logo_url || ''}
                alt={brand.display_name}
                className="max-h-20 max-w-full object-contain"
              />
            </button>
          ))
        )}
      </div>

      {/* Quick Add Panel (only in edit mode) */}
      {editMode && selectedBrand && (
        <QuickAddPanel
          brandId={selectedBrand}
          clinicCategories={clinicCategories}
          contactCategories={contactCategories}
          clinicsCount={clinics.length}
          contactsCount={contacts.length}
          onAddClinic={saveClinic}
          onAddContact={saveContact}
        />
      )}

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by clinic, department, extension, or contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading directory...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No directory categories found for this brand.</p>
          {isAdmin && (
            <p className="text-sm text-muted-foreground mt-2">
              Click "Manage Directory" to add categories and entries.
            </p>
          )}
        </div>
      ) : (
        <UnderlineTabs defaultValue={defaultTab} className="space-y-6">
          <UnderlineTabsList className="flex flex-wrap gap-0">
            {categories.map((category) => (
              <UnderlineTabsTrigger key={category.id} value={category.id}>
                {category.name}
              </UnderlineTabsTrigger>
            ))}
          </UnderlineTabsList>

          {clinicCategories.map((category) => {
            const categoryClinicsList = getClinicsByCategory(category.id!);
            const filteredClinics = filterClinics(categoryClinicsList);
            
            return (
              <TabsContent key={category.id} value={category.id!} className="space-y-4">
                <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredClinics.map((clinic) => (
                    <InlineClinicEditor
                      key={clinic.id}
                      clinic={clinic}
                      isEditing={editingId === clinic.id}
                      onEdit={() => editMode && setEditingId(clinic.id!)}
                      onSave={saveClinic}
                      onCancel={() => setEditingId(null)}
                      onDelete={() => setDeleteItem({ type: 'clinic', id: clinic.id!, name: clinic.name })}
                      showEditControls={editMode}
                    />
                  ))}
                </div>
                {filteredClinics.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    {searchQuery ? 'No results found' : 'No clinics in this category'}
                  </p>
                )}
              </TabsContent>
            );
          })}

          {contactCategories.map((category) => {
            const categoryContactsList = getContactsByCategory(category.id!);
            const filteredContactsList = filterContacts(categoryContactsList);
            
            return (
              <TabsContent key={category.id} value={category.id!} className="space-y-4">
                <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredContactsList.map((contact) => (
                    <InlineContactEditor
                      key={contact.id}
                      contact={contact}
                      isEditing={editingId === contact.id}
                      onEdit={() => editMode && setEditingId(contact.id!)}
                      onSave={saveContact}
                      onCancel={() => setEditingId(null)}
                      onDelete={() => setDeleteItem({ type: 'contact', id: contact.id!, name: contact.name })}
                      showEditControls={editMode}
                    />
                  ))}
                </div>
                {filteredContactsList.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    {searchQuery ? 'No results found' : 'No contacts in this category'}
                  </p>
                )}
              </TabsContent>
            );
          })}
        </UnderlineTabs>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteItem !== null} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteItem?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
