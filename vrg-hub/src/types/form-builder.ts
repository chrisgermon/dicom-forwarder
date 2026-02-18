export type FieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'
  | 'location'
  | 'catalog_item';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export type FieldDefaultValue = string | number | boolean | string[] | null;

export interface ConditionalLogic {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains';
  value: string | number | boolean;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: string[] | FieldOption[]; // Support both string arrays and FieldOption arrays
  validation?: FieldValidation;
  defaultValue?: FieldDefaultValue;
  conditionalLogic?: ConditionalLogic;
  order: number;
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  form_type: 'department_request' | 'hardware_request' | 'toner_request' | 'user_account_request' | 'general';
  fields: FormField[];
  settings?: {
    notification_emails?: string[];
    notification_user_ids?: string[];
    notification_level?: 'all' | 'new_only' | 'updates_only';
    enable_sms_notifications?: boolean;
    auto_assign?: boolean;
    require_approval?: boolean;
    approver_id?: string | null;
  };
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FormBuilderProps {
  template?: FormTemplate;
  onSave: (template: Partial<FormTemplate> & { categoryId?: string }) => void;
  onCancel: () => void;
}

export type FormSubmissionData = Record<string, FieldDefaultValue>;

export interface DynamicFormProps {
  template: FormTemplate;
  onSubmit: (data: FormSubmissionData) => void;
  isSubmitting?: boolean;
}
