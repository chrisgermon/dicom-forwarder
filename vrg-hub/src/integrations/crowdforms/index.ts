/**
 * CrowdForms Integration Package
 * 
 * Export all components, hooks, and utilities for easy importing.
 */

// Client
export { crowdformsClient } from './client';

// Types
export type {
  Brand,
  ProductSection,
  ProductItem,
  Clinic,
  SelectedItem,
  OrderFormData,
  OrderSubmission,
  OrderItem,
  OrderData,
} from './types';

// API Functions
export {
  fetchBrandForForm,
  fetchProductsForBrand,
  fetchClinicsForBrand,
  fetchClinicById,
  submitOrder,
  sendEmailNotification,
} from './api';

// Hooks
export { useFormData } from './hooks/useFormData';
export { useClinic } from './hooks/useClinic';
export { useClinics } from './hooks/useClinics';

// Components
export { EmbeddedOrderForm } from './components/EmbeddedOrderForm';
export { FieldRenderer } from './components/FieldRenderer';
export { ClinicSelect } from './components/ClinicSelect';

// Utilities
export { generateOrderPDF } from './lib/pdfGenerator';
