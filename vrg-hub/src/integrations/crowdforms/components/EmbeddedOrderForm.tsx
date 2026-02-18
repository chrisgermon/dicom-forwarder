/**
 * Embedded Order Form Component
 * 
 * A complete, ready-to-use form component that can be embedded in any Lovable project.
 * 
 * Usage:
 * <EmbeddedOrderForm formCode="674924" />
 * or with route params:
 * <Route path="/order/:formCode" element={<EmbeddedOrderForm />} />
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useFormData } from '../hooks/useFormData';
import { useClinic } from '../hooks/useClinic';
import { ClinicSelect } from './ClinicSelect';
import { FieldRenderer } from './FieldRenderer';
import { submitOrder, sendEmailNotification } from '../api';
import { generateOrderPDF } from '../lib/pdfGenerator';
import type { OrderFormData, SelectedItem, OrderData } from '../types';

interface EmbeddedOrderFormProps {
  formCode?: string;
  onSuccess?: (orderData: OrderData) => void;
  onError?: (error: string) => void;
}

export function EmbeddedOrderForm({ formCode: propFormCode, onSuccess, onError }: EmbeddedOrderFormProps) {
  const { formCode: routeFormCode } = useParams<{ formCode: string }>();
  const formCode = propFormCode || routeFormCode;

  const { brand, sections, items, loading, error } = useFormData(formCode);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>({
    practitionerName: '',
    contactEmail: '',
    contactPhone: '',
    billToClinic: '',
    deliverToClinic: '',
    selectedItems: [],
  });
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  const { clinic: billToClinicData } = useClinic(formData.billToClinic);
  const { clinic: deliverToClinicData } = useClinic(formData.deliverToClinic);

  // Sync field values to selected items
  useEffect(() => {
    const selectedItems: SelectedItem[] = [];
    
    items.forEach((item) => {
      const value = fieldValues[item.id];
      if (isValueNotEmpty(value)) {
        const section = sections.find((s) => s.id === item.section_id);
        selectedItems.push({
          itemId: item.id,
          productCode: item.product_code,
          productName: item.name,
          fieldType: item.field_type || 'text',
          value,
          sectionTitle: section?.title || '',
        });
      }
    });

    setFormData((prev) => ({ ...prev, selectedItems }));
  }, [fieldValues, items, sections]);

  const isValueNotEmpty = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object') {
      if (value.selection === 'other' && !value.customValue?.trim()) return false;
      if ('fieldValue' in value && (!value.fieldValue || value.fieldValue === '')) return false;
    }
    return true;
  };

  const handleFieldChange = (itemId: string, value: any) => {
    setFieldValues((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.practitionerName.trim() || !formData.contactEmail.trim()) {
      onError?.('Please fill in all required fields');
      alert('Please fill in all required fields');
      return;
    }

    if (formData.selectedItems.length === 0) {
      onError?.('Please select at least one product');
      alert('Please select at least one product');
      return;
    }

    if (!brand) {
      onError?.('Brand information not available');
      return;
    }

    setSubmitting(true);

    try {
      const submissionId = crypto.randomUUID();

      // Submit order
      const result = await submitOrder({
        id: submissionId,
        brand_id: brand.id,
        practitioner_name: formData.practitionerName.trim(),
        clinic_name: billToClinicData?.name || 'Unknown Clinic',
        contact_email: formData.contactEmail.trim(),
        contact_phone: formData.contactPhone.trim() || null,
        selected_items: formData.selectedItems,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Generate PDF
      const orderData: OrderData = {
        practitioner_name: formData.practitionerName,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone,
        items: formData.selectedItems.map((item) => ({
          name: item.productName,
          description: items.find((i) => i.id === item.itemId)?.description,
          product_code: item.productCode,
          quantity: item.value,
          section: item.sectionTitle,
        })),
        brand: {
          name: brand.name,
          primary_color: brand.primary_color,
          secondary_color: brand.secondary_color,
          logo_url: brand.logo_url,
          form_title: brand.form_title,
        },
        bill_to_clinic: billToClinicData
          ? { name: billToClinicData.name, address: billToClinicData.address || undefined }
          : undefined,
        deliver_to_clinic: deliverToClinicData
          ? { name: deliverToClinicData.name, address: deliverToClinicData.address || undefined }
          : undefined,
        submitted_at: new Date().toISOString(),
      };

      const pdfBlob = await generateOrderPDF(orderData);

      // Convert blob to base64 for email
      const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      const pdfBase64 = await blobToBase64(pdfBlob);

      // Send confirmation email
      await sendEmailNotification({
        to: formData.contactEmail,
        subject: `Order Confirmation - ${brand.name}`,
        html: generateConfirmationEmailHtml(formData, brand, billToClinicData, deliverToClinicData),
        brandId: brand.id,
        type: 'practitioner_confirmation',
        submissionId,
        attachment: {
          filename: `order-${submissionId}.pdf`,
          content: pdfBase64,
          type: 'application/pdf',
        },
      });

      setSubmitted(true);
      onSuccess?.(orderData);
    } catch (err: any) {
      console.error('Submission error:', err);
      onError?.(err.message || 'Failed to submit order');
      alert('Failed to submit order: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading form...</p>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Form not found'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: brand.primary_color }}>
            Order Submitted!
          </h2>
          <p className="text-gray-600 mb-4">
            Thank you for your order. A confirmation email has been sent to {formData.contactEmail}.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                practitionerName: '',
                contactEmail: '',
                contactPhone: '',
                billToClinic: '',
                deliverToClinic: '',
                selectedItems: [],
              });
              setFieldValues({});
            }}
            className="px-6 py-2 rounded text-white"
            style={{ backgroundColor: brand.primary_color }}
          >
            Submit Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div
          className="text-center py-8 px-6 rounded-t-lg text-white"
          style={{
            background: `linear-gradient(135deg, ${brand.primary_color}, ${brand.secondary_color})`,
          }}
        >
          {brand.logo_url && (
            <img src={brand.logo_url} alt={brand.name} className="h-16 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold">{brand.form_title || brand.name}</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-b-lg shadow-lg p-6 space-y-8">
          {/* Contact Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: brand.primary_color }}>
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Practitioner Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.practitionerName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, practitionerName: e.target.value }))}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Clinic Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: brand.primary_color }}>
              Clinic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bill To Clinic</label>
                <ClinicSelect
                  brandId={brand.id}
                  value={formData.billToClinic}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, billToClinic: value }))}
                  placeholder="Select billing clinic"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deliver To Clinic</label>
                <ClinicSelect
                  brandId={brand.id}
                  value={formData.deliverToClinic}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, deliverToClinic: value }))}
                  placeholder="Select delivery clinic"
                />
              </div>
            </div>
          </div>

          {/* Product Sections */}
          {sections.map((section) => {
            const sectionItems = items.filter((item) => item.section_id === section.id);
            if (sectionItems.length === 0) return null;

            return (
              <div key={section.id} className="space-y-4">
                <h2 className="text-lg font-semibold" style={{ color: brand.primary_color }}>
                  {section.title}
                </h2>
                {section.description && <p className="text-gray-600 text-sm">{section.description}</p>}

                <div className="space-y-6">
                  {sectionItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          {item.product_code && (
                            <span className="text-xs text-gray-500 font-mono">{item.product_code}</span>
                          )}
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                        {item.sample_url && (
                          <a
                            href={item.sample_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline"
                          >
                            View Sample
                          </a>
                        )}
                      </div>
                      <FieldRenderer
                        item={item}
                        value={fieldValues[item.id] || ''}
                        onChange={(value) => handleFieldChange(item.id, value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Order Summary */}
          {formData.selectedItems.length > 0 && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4" style={{ color: brand.primary_color }}>
                Order Summary ({formData.selectedItems.length} items)
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {formData.selectedItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.productName}</span>
                    <span className="text-gray-600">{formatValue(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={submitting || formData.selectedItems.length === 0}
              className="w-full py-3 px-6 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: brand.primary_color }}
            >
              {submitting ? 'Submitting...' : 'Submit Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatValue(value: any): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    if (value.selection === 'other') return `Other: ${value.customValue || ''}`;
    if (value.fieldValue !== undefined) {
      let result = String(value.fieldValue);
      if (value.isPersonalised) result += ' (Personalised)';
      return result;
    }
  }
  return String(value || '');
}

function generateConfirmationEmailHtml(
  formData: OrderFormData,
  brand: any,
  billToClinic: any,
  deliverToClinic: any
): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${brand.primary_color}, ${brand.secondary_color}); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Order Confirmation</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your order!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Dear ${formData.practitionerName},</p>
          <p>Thank you for submitting your order! We have received your request and it's being processed.</p>
          
          ${billToClinic || deliverToClinic ? `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Delivery Information</h3>
              ${billToClinic ? `<p><strong>Bill To:</strong> ${billToClinic.name}</p>` : ''}
              ${deliverToClinic ? `<p><strong>Deliver To:</strong> ${deliverToClinic.name}</p>` : ''}
            </div>
          ` : ''}
          
          <h2>Your Order Summary</h2>
          <ul>
            ${formData.selectedItems.map(item => `<li>${item.productName}: ${formatValue(item.value)}</li>`).join('')}
          </ul>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Order submitted on ${new Date().toLocaleString()}.
          </p>
        </div>
      </body>
    </html>
  `;
}
