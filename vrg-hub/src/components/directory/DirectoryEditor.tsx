import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Building2, Users, FolderOpen, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Brand, DirectoryCategory, Clinic, Contact } from '@/types/directory';
import { CategoryForm } from './forms/CategoryForm';
import { ClinicForm } from './forms/ClinicForm';
import { ContactForm } from './forms/ContactForm';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type EditingItem = 
  | { type: 'category'; data: DirectoryCategory }
  | { type: 'clinic'; data: Clinic }
  | { type: 'contact'; data: Contact }
  | null;

type DeleteItem = 
  | { type: 'category'; id: string; name: string }
  | { type: 'clinic'; id: string; name: string }
  | { type: 'contact'; id: string; name: string }
  | null;

export default function DirectoryEditor() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [categories, setCategories] = useState<DirectoryCategory[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem>(null);
  const [deleteItem, setDeleteItem] = useState<DeleteItem>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedBrand) return;
    
    setIsLoading(true);
    try {
      const [categoriesRes, clinicsRes, contactsRes] = await Promise.all([
        supabase
          .from('directory_categories')
          .select('*')
          .eq('brand_id', selectedBrand)
          .order('sort_order'),
        supabase
          .from('directory_clinics')
          .select('*')
          .eq('brand_id', selectedBrand)
          .order('sort_order'),
        supabase
          .from('directory_contacts')
          .select('*')
          .eq('brand_id', selectedBrand)
          .order('sort_order')
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (clinicsRes.error) throw clinicsRes.error;
      if (contactsRes.error) throw contactsRes.error;

      setCategories((categoriesRes.data || []).map(c => ({
        ...c,
        category_type: c.category_type as 'clinic' | 'contact'
      })));
      setClinics((clinicsRes.data || []).map(c => ({
        ...c,
        extensions: c.extensions as any as import('@/types/directory').Extension[]
      })));
      setContacts(contactsRes.data || []);
    } catch (error) {
      console.error('Error fetching directory data:', error);
      toast.error('Failed to load directory data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand) {
      fetchData();
    }
  }, [selectedBrand, fetchData]);

  const fetchBrands = async () => {
    const { data } = await supabase
      .from('brands')
      .select('id, name, display_name')
      .eq('is_active', true)
      .order('sort_order');
    
    if (data) {
      setBrands(data);
      if (data.length > 0) setSelectedBrand(data[0].id);
    }
  };

  const saveCategory = async (category: DirectoryCategory) => {
    const { error } = category.id
      ? await supabase.from('directory_categories').update(category).eq('id', category.id)
      : await supabase.from('directory_categories').insert([category]);

    if (error) {
      toast.error('Failed to save category');
      console.error(error);
    } else {
      toast.success('Category saved');
      fetchData();
      setEditingItem(null);
    }
  };

  const saveClinic = async (clinic: Clinic) => {
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
      
      toast.success('Clinic saved');
      fetchData();
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving clinic:', error);
      toast.error('Failed to save clinic');
    }
  };

  const saveContact = async (contact: Contact) => {
    const contactData = {
      ...contact,
      contact_type: contact.contact_type || 'admin'
    };
    const { error } = contact.id
      ? await supabase.from('directory_contacts').update(contactData).eq('id', contact.id)
      : await supabase.from('directory_contacts').insert([contactData]);

    if (error) {
      toast.error('Failed to save contact');
      console.error(error);
    } else {
      toast.success('Contact saved');
      fetchData();
      setEditingItem(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    
    let error;
    switch (deleteItem.type) {
      case 'category':
        ({ error } = await supabase.from('directory_categories').delete().eq('id', deleteItem.id));
        break;
      case 'clinic':
        ({ error } = await supabase.from('directory_clinics').delete().eq('id', deleteItem.id));
        break;
      case 'contact':
        ({ error } = await supabase.from('directory_contacts').delete().eq('id', deleteItem.id));
        break;
    }
    
    if (error) {
      toast.error(`Failed to delete ${deleteItem.type}`);
    } else {
      toast.success(`${deleteItem.type.charAt(0).toUpperCase() + deleteItem.type.slice(1)} deleted`);
      fetchData();
    }
    setDeleteItem(null);
  };

  const clinicCategories = categories.filter(c => c.category_type === 'clinic');
  const contactCategories = categories.filter(c => c.category_type === 'contact');

  const getCategoryName = (categoryId: string) => 
    categories.find(c => c.id === categoryId)?.name || 'Uncategorized';

  return (
    <div className="space-y-6">
      {/* Brand Selector */}
      <div className="space-y-2">
        <Label>Company</Label>
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select company" />
          </SelectTrigger>
          <SelectContent>
            {brands.map(brand => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBrand && (
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="clinics" className="gap-2">
              <Building2 className="h-4 w-4" />
              Clinics
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="h-4 w-4" />
              Contacts
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Categories organize your clinics and contacts into tabs
              </p>
              <Button onClick={() => setEditingItem({
                type: 'category',
                data: {
                  brand_id: selectedBrand,
                  name: '',
                  category_type: 'clinic',
                  sort_order: categories.length,
                  is_active: true
                }
              })}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {clinicCategories.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Clinic Categories
                    </h4>
                    <div className="space-y-2">
                      {clinicCategories.map(category => (
                        <CategoryItem
                          key={category.id}
                          category={category}
                          onEdit={() => setEditingItem({ type: 'category', data: category })}
                          onDelete={() => setDeleteItem({ type: 'category', id: category.id!, name: category.name })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {contactCategories.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Contact Categories
                    </h4>
                    <div className="space-y-2">
                      {contactCategories.map(category => (
                        <CategoryItem
                          key={category.id}
                          category={category}
                          onEdit={() => setEditingItem({ type: 'category', data: category })}
                          onDelete={() => setDeleteItem({ type: 'category', id: category.id!, name: category.name })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {categories.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No categories yet</p>
                    <p className="text-sm">Create your first category to get started</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Clinics Tab */}
          <TabsContent value="clinics" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {clinics.length} clinic{clinics.length !== 1 ? 's' : ''}
              </p>
              <Button 
                onClick={() => setEditingItem({
                  type: 'clinic',
                  data: {
                    brand_id: selectedBrand,
                    name: '',
                    phone: '',
                    address: '',
                    fax: '',
                    region: 'melbourne',
                    category_id: clinicCategories[0]?.id || '',
                    extensions: [],
                    sort_order: clinics.length,
                    is_active: true
                  }
                })}
                disabled={clinicCategories.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Clinic
              </Button>
            </div>

            {clinicCategories.length === 0 && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                Create a clinic category first before adding clinics
              </div>
            )}

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {clinics.map(clinic => (
                  <ClinicItem
                    key={clinic.id}
                    clinic={clinic}
                    categoryName={getCategoryName(clinic.category_id)}
                    onEdit={() => setEditingItem({ type: 'clinic', data: clinic })}
                    onDelete={() => setDeleteItem({ type: 'clinic', id: clinic.id!, name: clinic.name })}
                  />
                ))}

                {clinics.length === 0 && clinicCategories.length > 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No clinics yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
              </p>
              <Button 
                onClick={() => setEditingItem({
                  type: 'contact',
                  data: {
                    brand_id: selectedBrand,
                    name: '',
                    title: '',
                    contact_type: 'admin',
                    category_id: contactCategories[0]?.id || '',
                    sort_order: contacts.length,
                    is_active: true
                  }
                })}
                disabled={contactCategories.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </div>

            {contactCategories.length === 0 && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                Create a contact category first before adding contacts
              </div>
            )}

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {contacts.map(contact => (
                  <ContactItem
                    key={contact.id}
                    contact={contact}
                    categoryName={getCategoryName(contact.category_id)}
                    onEdit={() => setEditingItem({ type: 'contact', data: contact })}
                    onDelete={() => setDeleteItem({ type: 'contact', id: contact.id!, name: contact.name })}
                  />
                ))}

                {contacts.length === 0 && contactCategories.length > 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No contacts yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Dialog */}
      <Dialog open={editingItem !== null} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className={editingItem?.type === 'clinic' ? 'max-w-2xl' : 'max-w-md'}>
          <DialogHeader>
            <DialogTitle>
              {editingItem?.data && 'id' in editingItem.data && editingItem.data.id ? 'Edit' : 'Add'}{' '}
              {editingItem?.type === 'category' && 'Category'}
              {editingItem?.type === 'clinic' && 'Clinic'}
              {editingItem?.type === 'contact' && 'Contact'}
            </DialogTitle>
          </DialogHeader>
          
          {editingItem?.type === 'category' && (
            <CategoryForm
              category={editingItem.data}
              onSave={saveCategory}
              onCancel={() => setEditingItem(null)}
            />
          )}
          
          {editingItem?.type === 'clinic' && (
            <ClinicForm
              clinic={editingItem.data}
              categories={clinicCategories}
              onSave={saveClinic}
              onCancel={() => setEditingItem(null)}
            />
          )}
          
          {editingItem?.type === 'contact' && (
            <ContactForm
              contact={editingItem.data}
              categories={contactCategories}
              onSave={saveContact}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

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
    </div>
  );
}

// Sub-components for list items
function CategoryItem({ 
  category, 
  onEdit, 
  onDelete 
}: { 
  category: DirectoryCategory; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        {category.category_type === 'clinic' ? (
          <Building2 className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Users className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-medium">{category.name}</span>
        <Badge variant="outline" className="text-xs">Order: {category.sort_order}</Badge>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ClinicItem({ 
  clinic, 
  categoryName,
  onEdit, 
  onDelete 
}: { 
  clinic: Clinic; 
  categoryName: string;
  onEdit: () => void; 
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{clinic.name}</span>
          <Badge variant="secondary" className="text-xs">{categoryName}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {clinic.phone}
          </span>
          {clinic.extensions.length > 0 && (
            <span>{clinic.extensions.length} extensions</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          {clinic.address}
        </p>
      </div>
      <div className="flex gap-1 ml-2">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ContactItem({ 
  contact, 
  categoryName,
  onEdit, 
  onDelete 
}: { 
  contact: Contact; 
  categoryName: string;
  onEdit: () => void; 
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{contact.name}</span>
          <Badge variant="secondary" className="text-xs">{categoryName}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{contact.title}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {contact.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {contact.phone}
            </span>
          )}
          {contact.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {contact.email}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1 ml-2">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
