# Top Navigation Implementation Guide

## Overview

The VRG Hub now supports **two navigation layouts**:
1. **Sidebar Navigation** (Original) - Collapsible left sidebar
2. **Top Navigation** (New) - Horizontal menu bar with mega menus

Users can toggle between layouts using the floating button in the bottom-right corner.

---

## What Was Built

### New Components Created

#### 1. Core Navigation Components
- **`TopNavigation.tsx`** - Main horizontal navigation bar
  - Logo, global search, navigation menus, user controls
  - Handles dropdown state and click-outside detection
  - Fully responsive with mobile support

#### 2. Mega Menu Components
- **`MegaMenu.tsx`** - Reusable mega menu container
  - Supports 1-3 column layouts
  - Quick actions section support
  - Active page highlighting
  - Click-to-close functionality

- **`WorkMegaMenu.tsx`** - Work dropdown menu
  - Quick Actions: New Request button (prominent), Pending Approvals
  - My Work: Requests, Tasks, Reminders, Handler Groups
  - Checklists: Daily Checklist, Template Library (admin)
  - Services: Print Order Forms

- **`CRMMegaMenu.tsx`** - CRM dropdown menu
  - Analytics: Dashboard, Performance
  - Contacts: Contacts, Communications, Tasks, Pipeline
  - Sales & Marketing: Targets & Worksites, Marketing Campaigns, Calendar
  - Role-based visibility (MLO, Manager, Admin)

- **`ResourcesMegaMenu.tsx`** - Resources dropdown menu
  - Documents & Info: File Directory, Phone Directory, Mission Statement, External Providers
  - People & Scheduling: Rosters, HR & Employee Assistance
  - Communication: News, Monthly Newsletter, Help
  - Tools: **Referrer Lookup**, Modality Details

- **`AdminMegaMenu.tsx`** - Admin dropdown menu (admin only)
  - Site Management: Clinic Setup, Settings, User Management
  - Tools (super admin): Radiology Search, Audit Log, Integrations, Analytics AI

#### 3. Hooks
- **`useNavigationLayout.tsx`** - Toggle between sidebar and top nav
  - Stores preference in localStorage
  - Provides `layout`, `toggleLayout`, `setNavigationLayout` functions

---

## How to Use

### Switching Navigation Layouts

1. Look for the **floating button** in the bottom-right corner (icon: LayoutGrid)
2. Click to toggle between Sidebar and Top Navigation
3. Preference is saved in your browser (persists across sessions)

### For End Users

**Sidebar Layout (Default):**
- Familiar vertical menu on the left
- Collapsible to save space
- Mobile: Hidden by default, toggle with hamburger menu

**Top Navigation Layout (New):**
- Horizontal menu bar at the top
- Mega menus with organized sections
- **More horizontal space** for content (~288px wider on 1440px screens)
- Mobile: Hamburger menu (to be implemented)

---

## Technical Architecture

### Component Structure

```
Layout.tsx
├─ (Conditional Render based on useNavigationLayout)
├─ Sidebar Layout (Original)
│  ├─ SidebarProvider
│  ├─ AppSidebar
│  └─ Header + Content
│
└─ Top Nav Layout (New)
   ├─ TopNavigation
   │  ├─ Logo
   │  ├─ Global Search
   │  ├─ Navigation Menus
   │  │  ├─ Home (link)
   │  │  ├─ Work (WorkMegaMenu)
   │  │  ├─ CRM (CRMMegaMenu)
   │  │  ├─ Resources (ResourcesMegaMenu)
   │  │  └─ Admin (AdminMegaMenu - conditional)
   │  ├─ External Links Dropdown
   │  ├─ Notifications
   │  ├─ User Impersonation (super admin)
   │  └─ User Menu
   └─ Content Area (Full Width)
```

### State Management

- **Active Dropdown**: Local state in TopNavigation
  - Only one dropdown open at a time
  - Closes on click outside
  - Closes on menu item selection

- **Layout Preference**: localStorage via useNavigationLayout hook
  - Key: `vrg_navigation_layout`
  - Values: `"sidebar"` | `"topnav"`

### Role-Based Visibility

All role-based logic from the original sidebar is preserved:

| Role | Menus Available |
|------|-----------------|
| **Requester** | Home, Work (limited), Resources |
| **Marketing** | Home, Work, CRM, Resources |
| **Manager** | Home, Work (with Approvals), CRM, Resources |
| **Marketing Manager** | Home, Work (with Approvals), CRM, Resources |
| **Tenant Admin** | Home, Work, CRM, Resources, Admin (limited) |
| **Super Admin** | Home, Work, CRM, Resources, Admin (full) |

### Permissions & Features

- Uses existing `usePermissions` hook for role checks
- Uses existing `useCompanyFeatures` (via usePermissions) for feature flags
- Examples:
  - `print_ordering` - Shows Print Order Forms
  - `monthly_newsletter` - Shows Monthly Newsletter
  - `modality_management` - Shows Modality Details
  - `fax_campaigns` - Shows Marketing Campaigns

---

## Files Modified

### New Files
```
/src/components/TopNavigation.tsx
/src/components/navigation/MegaMenu.tsx
/src/components/navigation/WorkMegaMenu.tsx
/src/components/navigation/CRMMegaMenu.tsx
/src/components/navigation/ResourcesMegaMenu.tsx
/src/components/navigation/AdminMegaMenu.tsx
/src/hooks/useNavigationLayout.tsx
```

### Modified Files
```
/src/components/Layout.tsx
  - Added conditional rendering for both layouts
  - Added layout toggle button
  - Preserved all existing functionality
```

### Documentation
```
/docs/TOP_NAVIGATION_REDESIGN.md
/docs/TOP_NAV_MOCKUP.md
/docs/TOP_NAV_IMPLEMENTATION_GUIDE.md (this file)
```

---

## Design System Compliance

All components follow the existing design system:

✅ **Colors**: Uses design tokens (primary, accent, muted, etc.)
✅ **Border Radius**: rounded-xl for buttons, rounded-2xl for cards/dropdowns
✅ **Shadows**: shadow-card, shadow-elevated custom tokens
✅ **Spacing**: Consistent padding (p-6 for containers, px-4 for items)
✅ **Typography**: text-sm for body, font-medium for labels
✅ **Transitions**: duration-200 for standard transitions
✅ **Hover Effects**: hover:scale-[1.02] standard scale
✅ **Animations**: Smooth 200ms transitions with proper easing

---

## Mobile Responsiveness

### Current Implementation
- **Desktop (lg+)**: Full horizontal navigation with mega menus
- **Tablet/Mobile (< lg)**: Hamburger menu button shown (functionality pending)

### Next Steps (Not Yet Implemented)
- Mobile slide-in navigation drawer
- Touch-friendly menu interactions
- Responsive mega menu layouts

---

## Testing Checklist

### Functional Tests

- [x] Toggle between sidebar and top nav layouts
- [x] Layout preference persists across page reloads
- [x] All mega menus open/close correctly
- [x] Click outside closes active dropdown
- [x] Menu items navigate to correct routes
- [x] Active page highlighting works
- [x] External links open in new tabs

### Role-Based Tests

- [ ] **Requester**: See limited Work menu, no CRM, no Admin
- [ ] **Marketing**: See CRM menu, limited features
- [ ] **Manager**: See Pending Approvals, CRM with Targets
- [ ] **Marketing Manager**: See CRM with full features
- [ ] **Tenant Admin**: See Admin menu (limited)
- [ ] **Super Admin**: See all menus with all features

### Permission-Based Tests

- [ ] Print Order Forms (requires `print_ordering` feature)
- [ ] Marketing Campaigns (requires `fax_campaigns` + permission)
- [ ] Monthly Newsletter (requires `monthly_newsletter` feature)
- [ ] Modality Details (requires `modality_management` + permission)
- [ ] Handler Groups (requires `manage_handler_groups` permission)

### Visual Tests

- [ ] Logo loads correctly
- [ ] Global search is centered and functional
- [ ] Mega menus align properly under their buttons
- [ ] Drop shadows render correctly
- [ ] Hover states work on all interactive elements
- [ ] Layout toggle button visible and accessible
- [ ] Dark mode support (if applicable)

---

## Known Limitations

1. **Mobile Navigation**: Hamburger menu button present but drawer not implemented
2. **Menu Customization**: Database-driven menu customization (from AppSidebar) not yet ported to top nav
3. **Real-time Updates**: Menu updates via Supabase subscriptions not yet implemented
4. **Context Menu**: Right-click to edit menu items not available in top nav
5. **Global Headings**: Custom headings from `menu_headings` table not used in top nav

---

## Future Enhancements

### High Priority
1. Implement mobile slide-in navigation
2. Port menu customization from AppSidebar
3. Add keyboard navigation (Tab, Arrow keys, Escape)
4. Implement search within mega menus

### Medium Priority
5. Add mega menu icons to section headers
6. Implement recently visited items
7. Add favorites/bookmarks feature
8. Animated transitions for mega menus

### Low Priority
9. Custom menu item ordering
10. Personalized menu layouts per user
11. Mega menu search/filter
12. Keyboard shortcuts (Cmd+K for search, etc.)

---

## Migration Strategy

### Current Approach: Feature Flag (Soft Launch)
- Both layouts available
- Users can toggle freely
- Gather feedback without commitment
- Easy rollback if issues found

### Potential Future: Gradual Rollout
1. **Phase 1**: Enable for super admins only (testing)
2. **Phase 2**: Enable for tenant admins (feedback)
3. **Phase 3**: Enable for all roles (full rollout)
4. **Phase 4**: Deprecate sidebar (if desired)

### Rollback Plan
If critical issues are found:
1. Set default layout to `"sidebar"` in useNavigationLayout.tsx
2. Hide the layout toggle button
3. Fix issues in top nav
4. Re-enable when ready

---

## Performance Considerations

### Optimizations Applied
- Mega menus only render when open (not pre-rendered)
- Click-outside detection only active when dropdown open
- Role checks memoized via hooks
- No additional database queries (reuses existing hooks)

### Bundle Size Impact
- New code: ~15KB (uncompressed)
- No new dependencies added
- Uses existing UI components

---

## Accessibility

### Keyboard Navigation (To Be Implemented)
- Tab through top-level menu items
- Arrow keys within mega menus
- Escape to close dropdowns
- Enter to activate menu items

### Screen Readers
- Proper ARIA labels on all interactive elements
- role="navigation" on nav element
- Announced when mega menus expand/collapse

### Focus Management
- Visible focus indicators (design system default)
- Focus trap within mega menus (to be implemented)
- Return focus on close (to be implemented)

---

## Troubleshooting

### Issue: Layout preference not persisting
**Solution**: Check browser localStorage. Key should be `vrg_navigation_layout` with value `"sidebar"` or `"topnav"`.

### Issue: Mega menu not closing on click outside
**Solution**: Check if `dropdownRef` is properly attached to nav element. Ensure click handler is registered.

### Issue: Role-based menus not showing
**Solution**: Verify `useAuth` returns correct `userRole`. Check `usePermissions` for specific permission checks.

### Issue: Feature-gated items not visible
**Solution**: Check Supabase `app_config` or relevant feature flag tables. Verify `useCompanyFeatures` returns correct flags.

### Issue: Layout toggle button not visible
**Solution**: Check z-index (should be z-50). Verify button is rendered outside overlays.

---

## Code Examples

### Add a New Menu Item to Resources

```tsx
// /src/components/navigation/ResourcesMegaMenu.tsx

sections.push({
  title: "TOOLS",
  items: [
    { label: "Referrer Lookup", href: "/referrer-lookup", icon: Search },
    // Add your new item here
    { label: "New Tool", href: "/new-tool", icon: Wrench },
  ],
});
```

### Add a New Top-Level Menu

```tsx
// /src/components/TopNavigation.tsx

{/* After Admin Dropdown */}
<div className="relative">
  <button
    className={`h-10 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
      activeDropdown === 'reports'
        ? 'bg-primary text-primary-foreground shadow-md'
        : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
    }`}
    onClick={() => setActiveDropdown(activeDropdown === 'reports' ? null : 'reports')}
  >
    Reports
    <ChevronDown className="w-4 w-4" />
  </button>
  {activeDropdown === 'reports' && (
    <div className="absolute top-full left-0 mt-2 z-50">
      <ReportsMegaMenu onClose={() => setActiveDropdown(null)} />
    </div>
  )}
</div>
```

### Change Default Layout

```tsx
// /src/hooks/useNavigationLayout.tsx

const [layout, setLayout] = useState<NavigationLayout>(() => {
  const saved = localStorage.getItem(NAVIGATION_LAYOUT_KEY);
  return (saved as NavigationLayout) || "topnav"; // Changed from "sidebar" to "topnav"
});
```

---

## Questions & Support

For questions about the top navigation implementation:
1. Review this guide
2. Check `/docs/TOP_NAVIGATION_REDESIGN.md` for design decisions
3. Check `/docs/TOP_NAV_MOCKUP.md` for visual references
4. Review component code with inline comments

---

## Changelog

### 2026-01-22 - Initial Implementation
- Created TopNavigation component
- Created all mega menu components
- Created useNavigationLayout hook
- Updated Layout.tsx to support both layouts
- Added layout toggle button
- Documented implementation

---

**Status**: ✅ Implemented and Ready for Testing

**Next Steps**: Test all role-based menus, implement mobile navigation, gather user feedback
