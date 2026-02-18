/**
 * Common type definitions used throughout the application
 * Centralized to ensure consistency and maintainability
 */

import type { Database } from '@/integrations/supabase/types';

// Database table row types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Company = Database['public']['Tables']['app_config']['Row'];
export type Brand = Database['public']['Tables']['brands']['Row'];
export type Location = Database['public']['Tables']['locations']['Row'];

// User roles (matching RBAC system)
export type UserRole =
  | 'requester'
  | 'manager'
  | 'marketing_manager'
  | 'tenant_admin'
  | 'super_admin'
  | 'marketing';

// Role priority for determining highest role
export const ROLE_PRIORITY: Record<UserRole, number> = {
  super_admin: 100,
  tenant_admin: 90,
  marketing_manager: 60,
  manager: 50,
  marketing: 40,
  requester: 10,
} as const;

// Request/ticket types
export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'in_progress'
  | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Common UI types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type ToastVariant = 'default' | 'destructive';

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Async operation result type
export interface AsyncResult<T, E = Error> {
  data?: T;
  error?: E;
  loading: boolean;
}

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter types
export interface DateRange {
  from: Date;
  to: Date;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}
