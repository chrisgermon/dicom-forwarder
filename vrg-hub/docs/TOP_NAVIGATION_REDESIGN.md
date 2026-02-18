# Top Navigation Redesign Proposal

## Overview
Convert VRG Hub from sidebar navigation to horizontal top navigation to maximize browsing space, following modern intranet design patterns.

## Design Goals
1. **Maximize content space** - Remove sidebar to give full width to content
2. **Maintain all functionality** - Preserve role-based access, menu customization, real-time updates
3. **Follow design system** - Use existing tokens (rounded-xl, shadow-card, etc.)
4. **Mobile responsive** - Collapse to hamburger menu on mobile
5. **Logical grouping** - Organize items into intuitive mega-menu dropdowns

---

## Current vs. Proposed Layout

### Current Layout
```
┌─────────────────────────────────────────────────┐
│ [Sidebar]  │ Header (Logo, User, etc.)          │
│            ├─────────────────────────────────────┤
│ - Home     │                                     │
│ - Docs     │                                     │
│ - HR       │        Main Content                 │
│ - CRM      │        (Reduced width due to        │
│   - Dash   │         sidebar)                    │
│   - Tasks  │                                     │
│ - Admin    │                                     │
│ ...        │                                     │
└────────────┴─────────────────────────────────────┘
```

### Proposed Layout
```
┌─────────────────────────────────────────────────┐
│ Logo │ Home │ Work │ CRM │ Resources │ Admin │ │
│      │      │      │     │           │       │ │
├─────────────────────────────────────────────────┤
│                                                  │
│                                                  │
│          Main Content (Full Width!)              │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Menu Structure Mapping

### 1. **Home** (Single Item)
- Home Dashboard
- Always visible, no dropdown

### 2. **Work** (Mega Menu)
Main workflow items:
- **Quick Actions**
  - New Request (prominent button)
  - Pending Approvals
  - Daily Checklist
  - Template Library (if admin)
- **My Work**
  - Requests
  - Handler Groups (if admin)
  - Tasks
  - Reminders
- **Services**
  - Print Order Forms
  - Referrer Lookup

### 3. **CRM** (Mega Menu)
Customer relationship management:
- Dashboard
- Performance
- Contacts
- Communications
- Tasks
- Pipeline
- Targets & Worksites
- Marketing Campaigns
- Marketing Calendar

### 4. **Resources** (Mega Menu)
Company resources and information:
- **Documents & Info**
  - File Directory
  - Phone Directory
  - Mission Statement
  - External Providers
- **People & Scheduling**
  - Rosters
  - HR & Employee Assistance
- **Communication**
  - News
  - Monthly Newsletter
  - Help

### 5. **Systems** (Mega Menu - Conditional)
Technical and equipment items:
- Modality Details
- Equipment (category items)

### 6. **Admin** (Mega Menu - Admin Only)
Administrative functions:
- **Site Management**
  - Clinic Setup
  - Settings
  - User Management
- **Tools**
  - Radiology Search
  - Audit Log
  - Integrations
  - Analytics AI

### 7. **External Links** (Right Side)
- Optiq (icon button)
- Foxo (icon button)
- Outlook Web (icon button)
- Microsoft Teams (icon button)

### 8. **User Menu** (Far Right)
- Notifications
- User Impersonation (if super_admin)
- Profile dropdown
  - My Profile
  - Sign Out

---

## Component Architecture

### New Components to Create:

1. **`TopNavigation.tsx`** - Main navigation bar component
2. **`TopNavigationMenu.tsx`** - Menu items with mega-menu dropdowns
3. **`MegaMenu.tsx`** - Reusable mega-menu dropdown container
4. **`QuickActions.tsx`** - Quick action buttons panel
5. **`MobileNavMenu.tsx`** - Mobile hamburger menu

### Key Features to Preserve:

✅ Role-based menu visibility
✅ Database-driven menu customization
✅ Real-time menu updates via Supabase
✅ Menu item editing (context menu for admins)
✅ Global search
✅ Icon customization
✅ Label customization

---

## Visual Design Specifications

### Top Navigation Bar
```tsx
// Height: 64px (h-16)
// Background: bg-card with border-b
// Shadow: shadow-sm
// Padding: px-4 lg:px-6
// Border radius: None (full width)
```

### Mega Menu Dropdowns
```tsx
// Container: rounded-2xl shadow-elevated
// Background: bg-popover
// Width: Variable (600px-800px based on content)
// Padding: p-6
// Max columns: 3 per mega menu
// Gap: gap-8 between columns
```

### Menu Items
```tsx
// Top level: h-10 px-4 rounded-xl text-sm font-medium
// Hover: bg-accent text-accent-foreground
// Active: bg-primary text-primary-foreground
// Transition: transition-all duration-200
```

### Quick Action Buttons
```tsx
// "New Request" button: bg-primary text-primary-foreground
// Height: h-11 px-6 rounded-xl shadow-md
// Hover: hover:shadow-lg hover:scale-[1.02]
```

---

## Role-Based Menu Visibility

### All Users
- Home
- Work (limited)
- Resources

### Requester
- Home
- Work (New Request, Requests, Reminders)
- Resources (Documents, Rosters, HR, Phone Directory)

### Marketing/MLO
- Home
- Work (full)
- CRM (full)
- Resources (full)

### Manager
- Home
- Work (with Approvals)
- CRM (full)
- Resources (full)

### Tenant Admin
- Home
- Work (full)
- CRM (full)
- Resources (full)
- Systems
- Admin (limited - Clinic Setup, Settings, User Management)

### Super Admin
- Home
- Work (full)
- CRM (full)
- Resources (full)
- Systems
- Admin (full)

---

## Mobile Responsiveness

### Breakpoints
- **lg (1024px+)**: Full horizontal navigation with mega menus
- **md (768px-1023px)**: Condensed horizontal navigation, smaller dropdowns
- **sm (< 768px)**: Hamburger menu (similar to current mobile behavior)

### Mobile Menu (< 768px)
```
┌──────────────────────┐
│ ≡ Logo      🔔 👤    │ <- Header with hamburger
└──────────────────────┘

When hamburger clicked:
┌──────────────────────┐
│ [Slide-in Menu]      │
│ - Home               │
│ - Work >             │
│ - CRM >              │
│ - Resources >        │
│ - Admin >            │
│ [Quick Actions]      │
│ - New Request        │
│ - Referrer Lookup    │
└──────────────────────┘
```

---

## Implementation Plan

### Phase 1: Setup (Create New Components)
1. Create `TopNavigation.tsx` with basic structure
2. Create `MegaMenu.tsx` reusable component
3. Create menu configuration helper functions
4. Test with mock data

### Phase 2: Migration (Move Logic)
1. Extract menu configuration logic from `AppSidebar.tsx`
2. Adapt role-based visibility checks
3. Migrate database customization hooks
4. Implement real-time updates

### Phase 3: Styling (Design System)
1. Apply design system tokens
2. Add animations and transitions
3. Implement hover states
4. Add focus management for accessibility

### Phase 4: Responsive (Mobile)
1. Create mobile hamburger menu
2. Add breakpoint-based rendering
3. Test on various screen sizes
4. Optimize touch interactions

### Phase 5: Integration (Update Layout)
1. Update `Layout.tsx` to use TopNavigation
2. Remove SidebarProvider
3. Adjust content area styles
4. Test all pages with new layout

### Phase 6: Testing & Polish
1. Test all role-based menus
2. Verify database customization works
3. Test real-time updates
4. Accessibility audit
5. Performance optimization

---

## Migration Strategy

### Option A: Feature Flag (Recommended)
Add a feature flag to allow users to toggle between old and new navigation:
```tsx
const useTopNavigation = useFeatureFlag('top_navigation');
return useTopNavigation ? <TopNavigation /> : <AppSidebar />;
```

**Pros:**
- Safe rollback if issues found
- Can gather user feedback
- Gradual migration by role

**Cons:**
- Need to maintain both systems temporarily

### Option B: Direct Replacement
Replace sidebar navigation entirely in one deployment:

**Pros:**
- Clean cut, single codebase
- Forces commitment to new design

**Cons:**
- Higher risk if issues found
- User adjustment period

---

## Accessibility Considerations

1. **Keyboard Navigation**
   - Tab through all menu items
   - Arrow keys within mega menus
   - Escape to close dropdowns

2. **Screen Readers**
   - Proper ARIA labels
   - Role="navigation"
   - Announce expanded/collapsed states

3. **Focus Management**
   - Visible focus indicators
   - Focus trap within mega menus
   - Return focus on close

4. **Color Contrast**
   - WCAG AA compliance
   - Test in light and dark modes

---

## Performance Optimization

1. **Code Splitting**
   - Lazy load mega menu content
   - Only render visible dropdowns

2. **Memoization**
   - React.memo for menu items
   - useMemo for filtered lists

3. **Virtualization**
   - Not needed (menus are small)

4. **Database Queries**
   - Reuse existing customization queries
   - No additional overhead

---

## Questions for User

1. **New Request Button**: Should this remain prominently in the "Work" dropdown, or would you prefer it in the top bar itself (always visible)?

2. **Quick Links**: The current header has Mission Statement, Phone Directory, etc. Should these move entirely into the Resources menu, or keep some in the top bar?

3. **Global Search**: Should this be in the top navigation bar (always visible) or move to a modal activated by keyboard shortcut (Cmd+K)?

4. **Referrer Lookup**: Currently in sidebar footer - should this be in the Work menu, or a persistent button in the top bar?

5. **External Links** (Optiq, Foxo, Outlook, Teams): Should these be icon-only buttons in the top bar, or move to a dropdown menu?

---

## Next Steps

Once approved, I will:
1. Create the new TopNavigation component
2. Build out mega menu structure
3. Migrate all role-based logic
4. Update Layout.tsx
5. Test thoroughly across roles

**Estimated Implementation:** This is a significant redesign that will require careful implementation to maintain all existing functionality while improving the layout.
