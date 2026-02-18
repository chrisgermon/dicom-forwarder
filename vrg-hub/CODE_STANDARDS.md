# Code Standards and Best Practices

This document outlines the coding standards, patterns, and best practices for this project.

## Table of Contents
1. [TypeScript Standards](#typescript-standards)
2. [Naming Conventions](#naming-conventions)
3. [File Organization](#file-organization)
4. [Component Patterns](#component-patterns)
5. [Error Handling](#error-handling)
6. [State Management](#state-management)
7. [Utilities Usage](#utilities-usage)

---

## TypeScript Standards

### Type Safety
- **NEVER use `any`** - Use proper types or `unknown` if type is truly unknown
- **Use type imports** - `import type { TypeName } from './types'`
- **Leverage generated types** - Use types from `@/integrations/supabase/types.ts`
- **Create custom types** - Add new types to appropriate files in `src/types/`

### Configuration
Current TypeScript configuration enforces:
- `noUnusedLocals: true` - No unused variables
- `noUnusedParameters: true` - No unused function parameters
- `noFallthroughCasesInSwitch: true` - All switch cases must have break/return

**Goal**: Gradually enable strict mode

### Examples

❌ **Bad:**
```typescript
const data: any = await fetchData();
const user: any = response.user;
```

✅ **Good:**
```typescript
import type { Profile } from '@/types/common';

const data = await fetchData(); // Type inferred
const user: Profile = response.user;
```

---

## Naming Conventions

### Files and Folders
- **Components**: PascalCase - `UserProfile.tsx`, `RequestsList.tsx`
- **Utilities/Hooks**: camelCase - `useAuth.tsx`, `formatDate.ts`
- **Types**: camelCase - `common.ts`, `request.ts`
- **Folders**: kebab-case - `form-builder/`, `user-management/`

### Functions and Variables
- **Handlers**: Use `handle` prefix - `handleSubmit`, `handleDelete`
- **Callbacks**: Use `on` prefix for props - `onSubmit`, `onCancel`
- **Booleans**: Use `is/has` prefix - `isLoading`, `hasPermission`, `canEdit`
- **Async functions**: Clear verb - `fetchUser`, `createRequest`, `updateProfile`

### Constants
- **Use UPPER_SNAKE_CASE** for true constants:
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const API_ENDPOINT = '/api/v1';
```

### Examples

❌ **Bad:**
```typescript
const loading = false;
const data = true;
function click() {}
function submit() {}
```

✅ **Good:**
```typescript
const isLoading = false;
const hasData = true;
function handleClick() {}
function handleSubmit() {}
```

---

## File Organization

### Project Structure
```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (shadcn/ui)
│   ├── [feature]/      # Feature-specific components
│   └── [Feature].tsx   # Standalone components
├── pages/              # Page components (routes)
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
│   ├── ui-utils.ts     # UI helpers (badges, formatting)
│   ├── date-utils.ts   # Date formatting/manipulation
│   ├── error-utils.ts  # Error handling
│   ├── storage-utils.ts # localStorage with error handling
│   ├── validation-utils.ts # Form validation
│   └── logger.ts       # Centralized logging
├── types/              # TypeScript type definitions
│   ├── index.ts        # Central export
│   ├── common.ts       # Shared types
│   ├── request.ts      # Request-related types
│   └── form-builder.ts # Form builder types
├── integrations/       # Third-party integrations
│   └── supabase/       # Supabase client & types
└── contexts/           # React contexts
```

### Import Order
```typescript
// 1. External imports
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal imports (aliased)
import type { Profile } from '@/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/date-utils';
import { logger } from '@/lib/logger';

// 3. Relative imports
import { LocalComponent } from './LocalComponent';
```

---

## Component Patterns

### Component Structure
```typescript
import type { FC } from 'react';
import type { Profile } from '@/types';

interface UserProfileProps {
  profile: Profile;
  onUpdate: (profile: Profile) => void;
  isEditable?: boolean;
}

export const UserProfile: FC<UserProfileProps> = ({
  profile,
  onUpdate,
  isEditable = false,
}) => {
  // 1. Hooks (useState, useEffect, custom hooks)
  const [isEditing, setIsEditing] = useState(false);
  const { hasPermission } = useAuth();

  // 2. Derived state / computations
  const canEdit = isEditable && hasPermission('profiles', 'update');

  // 3. Event handlers
  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Implementation
  };

  // 4. Effects
  useEffect(() => {
    // Side effects
  }, []);

  // 5. Early returns
  if (!profile) return null;

  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### Export Patterns
- **Prefer named exports** for components: `export const UserProfile`
- **Use default exports** sparingly (mainly for pages)

---

## Error Handling

### Use Centralized Error Utilities

❌ **Bad:**
```typescript
try {
  await fetchData();
} catch (error) {
  console.log(error); // Don't use console.log
}
```

✅ **Good:**
```typescript
import { handleError } from '@/lib/error-utils';
import { logger } from '@/lib/logger';

try {
  await fetchData();
} catch (error) {
  const message = handleError(error, 'Failed to fetch data');
  toast({ title: 'Error', description: message, variant: 'destructive' });
}
```

### Error Handling Patterns

1. **Always handle errors in async operations**
2. **Provide user-friendly messages**
3. **Log errors for debugging**
4. **Use toast notifications for user feedback**

```typescript
import { getErrorMessage, handleError } from '@/lib/error-utils';
import { toast } from 'sonner';

const handleSubmit = async (data: FormData) => {
  try {
    const result = await supabase
      .from('profiles')
      .update(data);

    if (result.error) throw result.error;

    toast.success('Profile updated successfully');
  } catch (error) {
    const message = handleError(error, 'Profile update');
    toast.error(message);
  }
};
```

---

## State Management

### When to Use What

1. **Local State (useState)**: Component-specific state
   ```typescript
   const [isOpen, setIsOpen] = useState(false);
   ```

2. **React Query**: Server state, data fetching
   ```typescript
   const { data, isLoading, error } = useQuery({
     queryKey: ['profile', userId],
     queryFn: () => fetchProfile(userId),
   });
   ```

3. **Context**: Shared state across component tree
   ```typescript
   const { user, profile } = useAuth();
   const { checkPermission } = useRBAC();
   ```

### Data Fetching Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['requests', filterType],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('type', filterType);

    if (error) throw error;
    return data;
  },
});

// Mutation
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: async (newRequest: RequestCreate) => {
    const { data, error } = await supabase
      .from('requests')
      .insert(newRequest);

    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['requests'] });
    toast.success('Request created');
  },
  onError: (error) => {
    const message = handleError(error, 'Create request');
    toast.error(message);
  },
});
```

---

## Utilities Usage

### Date Formatting
```typescript
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/date-utils';

const displayDate = formatDate(request.created_at); // "Jan 15, 2024"
const fullDate = formatDateTime(request.created_at); // "Jan 15, 2024 at 3:30 PM"
const relative = formatRelativeTime(request.created_at); // "2 hours ago"
```

### LocalStorage
```typescript
import { getFromStorage, setInStorage, removeFromStorage } from '@/lib/storage-utils';

// Safe get with default value
const preferences = getFromStorage('user-preferences', { theme: 'light' });

// Safe set (returns boolean)
const success = setInStorage('user-preferences', newPreferences);

// Safe remove
removeFromStorage('old-key');
```

### UI Utilities
```typescript
import { getStatusVariant, formatStatusText, truncateText } from '@/lib/ui-utils';

// Status badges
const variant = getStatusVariant(request.status);
<Badge variant={variant}>{formatStatusText(request.status)}</Badge>

// Text truncation
const shortDescription = truncateText(description, 100);
```

### Validation
```typescript
import { validateEmail, validateRequired, composeValidators } from '@/lib/validation-utils';

const validateEmailField = composeValidators(
  validateRequired,
  validateEmail
);

const error = validateEmailField(formData.email);
```

### Logging
```typescript
import { logger } from '@/lib/logger';

logger.debug('User action', { userId, action: 'click' });
logger.info('Request created', { requestId });
logger.warn('Unusual behavior detected', { details });
logger.error('Failed to save', error, { context });
```

---

## Best Practices

### Performance
- Use `React.memo` for expensive components
- Implement virtualization for long lists
- Use `useCallback` for callbacks passed to optimized children
- Use `useMemo` for expensive computations

### Security
- Always sanitize user input before displaying with `dangerouslySetInnerHTML`
- Use `DOMPurify` for HTML sanitization
- Validate all form inputs
- Check permissions before showing UI elements
- Use proper RBAC checks

### Accessibility
- Use semantic HTML elements
- Add proper ARIA labels
- Ensure keyboard navigation works
- Maintain proper heading hierarchy
- Use sufficient color contrast

### Testing (Future)
- Write unit tests for utilities
- Write integration tests for complex features
- Test error states and edge cases
- Test accessibility

---

## Migration Guide

### Replacing `any` Types
1. Check if type exists in `@/integrations/supabase/types.ts`
2. If not, check `@/types/`
3. Create new type if needed
4. Never use `any` - use `unknown` if truly unknown

### Updating localStorage Usage
Replace direct localStorage calls with our utilities:
```typescript
// Old
const data = JSON.parse(localStorage.getItem('key') || '{}');

// New
import { getFromStorage } from '@/lib/storage-utils';
const data = getFromStorage('key', {});
```

### Updating Error Handling
```typescript
// Old
catch (error) {
  console.error(error);
  toast({ title: 'Error occurred' });
}

// New
import { handleError } from '@/lib/error-utils';
catch (error) {
  const message = handleError(error, 'Operation name');
  toast.error(message);
}
```

---

## Questions?

If you're unsure about a pattern:
1. Check this guide
2. Look for similar code in the codebase
3. Check utility files in `src/lib/`
4. Ask the team

**Remember**: Consistency is key. Follow these patterns to maintain a clean, maintainable codebase.
