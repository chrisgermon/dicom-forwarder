import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DirectoryCategory, Clinic, Contact } from '@/types/directory';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const DIRECTORY_PAGE_SIZE = 500;

export function useDirectory(brandId?: string) {
  const [categories, setCategories] = useState<DirectoryCategory[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!brandId) return;
    
    setIsLoading(true);
    try {
      const categoryCols = 'id, brand_id, name, category_type, sort_order, is_active';
      const clinicCols = 'id, brand_id, name, phone, address, fax, region, category_id, extensions, sort_order, is_active';
      const contactCols = 'id, brand_id, name, title, phone, email, contact_type, category_id, sort_order, is_active';

      const [categoriesRes, clinicsRes, contactsRes] = await Promise.all([
        supabase
          .from('directory_categories')
          .select(categoryCols)
          .eq('brand_id', brandId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('directory_clinics')
          .select(clinicCols)
          .eq('brand_id', brandId)
          .eq('is_active', true)
          .order('sort_order')
          .limit(DIRECTORY_PAGE_SIZE),
        supabase
          .from('directory_contacts')
          .select(contactCols)
          .eq('brand_id', brandId)
          .eq('is_active', true)
          .order('sort_order')
          .limit(DIRECTORY_PAGE_SIZE)
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
      logger.error('Error fetching directory data', error);
      toast.error('Failed to load directory data');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  return {
    categories,
    clinics,
    contacts,
    isLoading,
    fetchData,
  };
}
