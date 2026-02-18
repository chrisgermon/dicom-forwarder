export interface Extension {
  name: string;
  number: string;
}

export interface Clinic {
  id?: string;
  brand_id: string;
  name: string;
  phone: string;
  address: string;
  fax: string;
  region?: string;
  category_id: string;
  extensions: Extension[];
  sort_order: number;
  is_active: boolean;
}

export interface Contact {
  id?: string;
  brand_id: string;
  name: string;
  title: string;
  phone?: string;
  email?: string;
  contact_type?: string;
  category_id: string;
  sort_order: number;
  is_active: boolean;
}

export interface DirectoryCategory {
  id?: string;
  brand_id: string;
  name: string;
  category_type: 'clinic' | 'contact';
  sort_order: number;
  is_active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  display_name: string;
  logo_url?: string | null;
}
