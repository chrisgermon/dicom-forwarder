/**
 * CrowdForms API Functions
 * 
 * Functions to interact with the CrowdForms backend.
 */

import { crowdformsClient } from './client';
import type { Brand, ProductSection, ProductItem, Clinic, OrderSubmission } from './types';

/**
 * Fetch brand data for a form code
 */
export async function fetchBrandForForm(formCode: string): Promise<Brand | null> {
  const { data, error } = await crowdformsClient.rpc('get_brand_for_form', {
    brand_form_code: formCode,
  });

  if (error) {
    console.error('Error fetching brand:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as Brand;
}

/**
 * Fetch products (sections and items) for a form code
 */
export async function fetchProductsForBrand(formCode: string): Promise<{
  sections: ProductSection[];
  items: ProductItem[];
}> {
  const { data, error } = await crowdformsClient.rpc('get_public_products_for_brand', {
    brand_form_code: formCode,
  });

  if (error) {
    console.error('Error fetching products:', error);
    throw error;
  }

  const sectionsMap = new Map<string, ProductSection>();
  const itemsArray: ProductItem[] = [];

  (data || []).forEach((row: any) => {
    if (!sectionsMap.has(row.section_id)) {
      sectionsMap.set(row.section_id, {
        id: row.section_id,
        title: row.section_title,
        description: row.section_description,
        sort_order: row.section_sort_order,
      });
    }

    itemsArray.push({
      id: row.item_id,
      section_id: row.section_id,
      product_code: row.item_product_code || undefined,
      name: row.item_name,
      description: row.item_description || undefined,
      quantities: Array.isArray(row.item_quantities) ? row.item_quantities.map(String) : [],
      field_type: row.item_field_type || 'radio',
      sample_url: row.item_sample_url || undefined,
      sort_order: row.item_sort_order || 0,
      is_personalised: row.item_is_personalised || false,
    });
  });

  return {
    sections: Array.from(sectionsMap.values()).sort((a, b) => a.sort_order - b.sort_order),
    items: itemsArray.sort((a, b) => a.sort_order - b.sort_order),
  };
}

/**
 * Fetch clinics for a brand
 */
export async function fetchClinicsForBrand(brandId: string): Promise<Clinic[]> {
  const { data, error } = await crowdformsClient.rpc('get_clinics_for_forms', {
    brand_id_param: brandId,
  });

  if (error) {
    console.error('Error fetching clinics:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single clinic by ID
 */
export async function fetchClinicById(clinicId: string): Promise<Clinic | null> {
  const { data, error } = await crowdformsClient
    .rpc('get_clinic_for_form', { clinic_id_param: clinicId })
    .maybeSingle();

  if (error) {
    console.error('Error fetching clinic:', error);
    return null;
  }

  return data as Clinic | null;
}

/**
 * Submit an order
 */
export async function submitOrder(submission: OrderSubmission): Promise<{ success: boolean; error?: string }> {
  const submissionData = {
    id: submission.id || crypto.randomUUID(),
    brand_id: submission.brand_id,
    practitioner_name: submission.practitioner_name,
    clinic_name: submission.clinic_name,
    contact_email: submission.contact_email,
    contact_phone: submission.contact_phone || null,
    selected_items: submission.selected_items,
  };

  const { error } = await crowdformsClient.from('form_submissions').insert(submissionData);

  if (error) {
    console.error('Error submitting order:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Send email notification (calls the edge function)
 */
export async function sendEmailNotification(emailData: {
  to: string;
  subject: string;
  html: string;
  brandId: string;
  type: string;
  submissionId?: string;
  attachment?: {
    filename: string;
    content: string;
    type: string;
  };
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await crowdformsClient.functions.invoke('send-email', {
    body: emailData,
  });

  if (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
