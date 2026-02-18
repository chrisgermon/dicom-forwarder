/**
 * CrowdForms Type Definitions
 */

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  notification_email?: string;
  notification_emails?: string[];
  form_title?: string;
}

export interface ProductSection {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
}

export interface ProductItem {
  id: string;
  section_id: string;
  product_code?: string;
  name: string;
  description?: string;
  quantities: string[];
  field_type?: string;
  sample_url?: string;
  sort_order: number;
  is_personalised?: boolean;
}

export interface Clinic {
  id: string;
  name: string;
  address: string | null;
  brand_id?: string;
}

export interface SelectedItem {
  itemId: string;
  productCode?: string;
  productName: string;
  fieldType: string;
  value: any;
  sectionTitle: string;
}

export interface OrderFormData {
  practitionerName: string;
  contactEmail: string;
  contactPhone: string;
  billToClinic: string;
  deliverToClinic: string;
  selectedItems: SelectedItem[];
}

export interface OrderSubmission {
  id?: string;
  brand_id: string;
  practitioner_name: string;
  clinic_name: string;
  contact_email: string;
  contact_phone?: string | null;
  selected_items: SelectedItem[];
}

export interface OrderItem {
  name: string;
  description?: string;
  product_code?: string;
  quantity: string | any;
  section: string;
}

export interface OrderData {
  practitioner_name: string;
  contact_email: string;
  contact_phone?: string;
  items: OrderItem[];
  brand: {
    name: string;
    primary_color: string;
    secondary_color: string;
    logo_url?: string;
    form_title?: string;
  };
  bill_to_clinic?: {
    name: string;
    address?: string;
  };
  deliver_to_clinic?: {
    name: string;
    address?: string;
  };
  submitted_at: string;
}
