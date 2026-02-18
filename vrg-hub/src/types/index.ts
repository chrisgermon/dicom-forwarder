/**
 * Central export for all type definitions
 * Import types from here for better organization
 */

// Common types
export type {
  Profile,
  Company,
  Brand,
  Location,
  UserRole,
  RequestStatus,
  Priority,
  LoadingState,
  ToastVariant,
  Nullable,
  Optional,
  Maybe,
  AsyncResult,
  PaginationParams,
  PaginatedResponse,
  DateRange,
  SortConfig,
} from './common';

export { ROLE_PRIORITY } from './common';

// Request types
export type {
  RequestPriority,
  ItemSpecifications,
  HardwareRequest,
  RequestItem,
  RequestAttachment,
  RequestStatusHistory,
} from './request';

// Form builder types
export type {
  FieldType,
  FieldOption,
  FieldValidation,
  FieldDefaultValue,
  ConditionalLogic,
  FormField,
  FormTemplate,
  FormBuilderProps,
  DynamicFormProps,
  FormSubmissionData,
} from './form-builder';
