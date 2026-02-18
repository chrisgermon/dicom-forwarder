import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, User } from 'lucide-react';
import { DirectoryCategory, Clinic, Contact } from '@/types/directory';
import { cn } from '@/lib/utils';

interface QuickAddPanelProps {
  brandId: string;
  clinicCategories: DirectoryCategory[];
  contactCategories: DirectoryCategory[];
  clinicsCount: number;
  contactsCount: number;
  onAddClinic: (clinic: Clinic) => void;
  onAddContact: (contact: Contact) => void;
  className?: string;
}

type AddMode = 'none' | 'clinic' | 'contact';

export function QuickAddPanel({
  brandId,
  clinicCategories,
  contactCategories,
  clinicsCount,
  contactsCount,
  onAddClinic,
  onAddContact,
  className,
}: QuickAddPanelProps) {
  const [mode, setMode] = useState<AddMode>('none');
  
  // Clinic quick-add state
  const [clinicName, setClinicName] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicCategory, setClinicCategory] = useState(clinicCategories[0]?.id || '');
  
  // Contact quick-add state
  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactCategory, setContactCategory] = useState(contactCategories[0]?.id || '');

  const resetForm = () => {
    setMode('none');
    setClinicName('');
    setClinicPhone('');
    setContactName('');
    setContactTitle('');
  };

  const handleAddClinic = () => {
    if (clinicName.trim() && clinicPhone.trim() && clinicCategory) {
      onAddClinic({
        brand_id: brandId,
        name: clinicName.trim(),
        phone: clinicPhone.trim(),
        address: '',
        fax: '',
        region: 'melbourne',
        category_id: clinicCategory,
        extensions: [],
        sort_order: clinicsCount,
        is_active: true,
      });
      resetForm();
    }
  };

  const handleAddContact = () => {
    if (contactName.trim() && contactTitle.trim() && contactCategory) {
      onAddContact({
        brand_id: brandId,
        name: contactName.trim(),
        title: contactTitle.trim(),
        contact_type: 'admin',
        category_id: contactCategory,
        sort_order: contactsCount,
        is_active: true,
      });
      resetForm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'clinic' | 'contact') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'clinic') {
        handleAddClinic();
      } else {
        handleAddContact();
      }
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  if (mode === 'none') {
    return (
      <div className={cn("flex gap-2", className)}>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setMode('clinic')}
          disabled={clinicCategories.length === 0}
          className="gap-2"
        >
          <Building2 className="h-4 w-4" />
          Quick Add Clinic
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setMode('contact')}
          disabled={contactCategories.length === 0}
          className="gap-2"
        >
          <User className="h-4 w-4" />
          Quick Add Contact
        </Button>
      </div>
    );
  }

  if (mode === 'clinic') {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-muted/50 rounded-lg border", className)}>
        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Select value={clinicCategory} onValueChange={setClinicCategory}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {clinicCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id!}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'clinic')}
          placeholder="Clinic name"
          className="h-8 flex-1"
          autoFocus
        />
        <Input
          value={clinicPhone}
          onChange={(e) => setClinicPhone(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'clinic')}
          placeholder="Phone"
          className="h-8 w-36"
        />
        <Button 
          size="sm" 
          onClick={handleAddClinic}
          disabled={!clinicName.trim() || !clinicPhone.trim()}
          className="h-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={resetForm} className="h-8">
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 p-3 bg-muted/50 rounded-lg border", className)}>
      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select value={contactCategory} onValueChange={setContactCategory}>
        <SelectTrigger className="w-40 h-8">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {contactCategories.map(cat => (
            <SelectItem key={cat.id} value={cat.id!}>{cat.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, 'contact')}
        placeholder="Full name"
        className="h-8 flex-1"
        autoFocus
      />
      <Input
        value={contactTitle}
        onChange={(e) => setContactTitle(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, 'contact')}
        placeholder="Title"
        className="h-8 w-40"
      />
      <Button 
        size="sm" 
        onClick={handleAddContact}
        disabled={!contactName.trim() || !contactTitle.trim()}
        className="h-8"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={resetForm} className="h-8">
        Cancel
      </Button>
    </div>
  );
}
