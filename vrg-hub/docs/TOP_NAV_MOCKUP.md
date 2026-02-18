# Top Navigation Visual Mockup

## Desktop Layout (1920px+)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🏥 VRG                                                            🔔  👤 Chris Germon  ▼       │
│   Logo   Home   Work ▼   CRM ▼   Resources ▼   Systems ▼   Admin ▼    [Optiq] [Foxo]         │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│                                                                                                 │
│                           FULL WIDTH CONTENT AREA                                              │
│                         (No sidebar - Maximum space!)                                          │
│                                                                                                 │
│                                                                                                 │
│                                                                                                 │
│                                                                                                 │
│                                                                                                 │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Top Navigation Bar (Expanded View)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│  [VRG Logo]  │  Home  │  Work ▼  │  CRM ▼  │  Resources ▼  │  Systems ▼  │  Admin ▼  │   🔔 👤 │
│   (80px)     │ (70px) │  (80px)  │ (70px)  │    (120px)    │   (100px)   │  (80px)  │         │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
     ↑              ↑          ↑          ↑            ↑             ↑            ↑          ↑
  Company     Always    Main      CRM      Company      Tech      Admin     Notifications
   Brand     visible  workflow  features  resources   systems    tools      & Profile
```

**Height:** 64px (h-16)
**Background:** White (light mode) / Dark (dark mode)
**Border:** Bottom border (border-b)
**Shadow:** Subtle shadow (shadow-sm)

---

## Mega Menu Examples

### "Work" Mega Menu (When Clicked)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  [VRG Logo]  │  Home  │ [Work] ▼ │  CRM ▼  │  Resources ▼  │  Admin ▼  │   🔔 👤      │
└────────────────────────│──────────┴───────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────────────────────────────────────┐
        │  QUICK ACTIONS              MY WORK            SERVICES          │
        │  ┌──────────────────┐      • Requests         • Print Orders    │
        │  │  ➕ New Request  │      • Tasks            • Referrer Lookup  │
        │  │   (Big button)   │      • Reminders                           │
        │  └──────────────────┘      • Handler Groups                      │
        │                               (admin only)                        │
        │  • Pending Approvals                                             │
        │  • Daily Checklist                                               │
        │  • Template Library                                              │
        │    (admin only)                                                  │
        └──────────────────────────────────────────────────────────────────┘
        ↑ Width: ~700px, Rounded corners, Drop shadow
```

### "CRM" Mega Menu (When Clicked)

```
        ┌──────────────────────────────────────────────────────────────────┐
        │  ANALYTICS              CONTACTS              MARKETING          │
        │  • Dashboard            • Contacts            • Campaigns        │
        │  • Performance          • Communications      • Calendar         │
        │                         • Tasks                                  │
        │  SALES                  • Pipeline                               │
        │  • Targets & Worksites                                           │
        │                                                                  │
        └──────────────────────────────────────────────────────────────────┘
```

### "Resources" Mega Menu (When Clicked)

```
        ┌────────────────────────────────────────────────────────────────────┐
        │  DOCUMENTS & INFO        PEOPLE & SCHEDULING   COMMUNICATION       │
        │  • File Directory        • Rosters              • News             │
        │  • Phone Directory       • HR & Employee        • Newsletter       │
        │  • Mission Statement       Assistance           • Help             │
        │  • External Providers                                              │
        │                                                                    │
        │  EXTERNAL TOOLS                                                    │
        │  • Outlook Web →                                                   │
        │  • Microsoft Teams →                                               │
        └────────────────────────────────────────────────────────────────────┘
```

### "Admin" Mega Menu (Super Admin Only)

```
        ┌──────────────────────────────────────────────────────────────────┐
        │  SITE MANAGEMENT         TOOLS                                    │
        │  • Clinic Setup          • Radiology Search                       │
        │  • Settings              • Audit Log                              │
        │  • User Management       • Integrations                           │
        │                          • Analytics AI                           │
        └──────────────────────────────────────────────────────────────────┘
```

---

## Menu Item States

### Top Level Navigation Item

**Default State:**
```
┌──────────┐
│   Work   │  text-foreground/80, bg-transparent, hover:bg-accent
└──────────┘
```

**Hover State:**
```
┌──────────┐
│   Work   │  bg-accent, text-accent-foreground, rounded-xl
└──────────┘
```

**Active/Open State:**
```
┌──────────┐
│   Work   │  bg-primary, text-primary-foreground, rounded-xl, shadow-md
└──────────┘
```

### Mega Menu Items

**Default:**
```
• Dashboard    (text-foreground, hover:text-primary)
```

**Hover:**
```
• Dashboard    (text-primary, bg-accent/50, rounded-lg, padding)
```

**Active (Current Page):**
```
• Dashboard    (text-primary, font-semibold, underline decoration-2)
```

---

## Responsive Breakpoints

### Large Desktop (1920px+)
- Full mega menus with 3 columns
- All menu items visible
- Spacious padding

### Desktop (1280px - 1919px)
- Full mega menus with 2-3 columns
- All menu items visible
- Standard padding

### Laptop (1024px - 1279px)
- Condensed mega menus with 2 columns
- All menu items visible
- Reduced padding

### Tablet (768px - 1023px)
- Dropdown menus instead of mega menus
- Single column lists
- Some items may be hidden in "More" menu

### Mobile (< 768px)
- Hamburger menu (left side)
- Slide-in navigation drawer
- Stacked menu items
- Collapsible sections

---

## Mobile Layout (< 768px)

### Collapsed State
```
┌─────────────────────────────────┐
│  ≡   [VRG Logo]         🔔  👤  │
│                                 │
├─────────────────────────────────┤
│                                 │
│                                 │
│      FULL WIDTH CONTENT         │
│                                 │
│                                 │
└─────────────────────────────────┘
```

### Expanded State (Hamburger Clicked)
```
┌─────────────────┬───────────────┐
│  [SLIDE-IN]     │               │
│                 │               │
│  🏠 Home        │               │
│                 │               │
│  💼 Work    >   │   Content     │
│  📊 CRM     >   │   Area        │
│  📚 Resources > │  (Dimmed)     │
│  ⚙️  Admin   >  │               │
│                 │               │
│  ──────────     │               │
│  ➕ New Request │               │
│  🔍 Ref Lookup  │               │
│                 │               │
└─────────────────┴───────────────┘
   ↑ 280px wide drawer
```

---

## Quick Actions Button (Prominent)

The "New Request" button appears in multiple places for easy access:

1. **Desktop:** Inside "Work" mega menu (prominent)
2. **Mobile:** Quick action section in hamburger menu
3. **Optional:** Floating action button (FAB) in bottom-right corner

```
Desktop (in mega menu):
┌────────────────────────────┐
│  ➕  New Request           │  <- bg-primary, text-white,
│     Submit a new request   │     h-14, px-8, rounded-xl,
└────────────────────────────┘     shadow-lg, hover:scale-[1.02]

Mobile (in drawer):
┌────────────────────┐
│  ➕ New Request    │  <- Full width button
└────────────────────┘
```

---

## Global Search Integration

### Option 1: Always Visible (Recommended)
```
┌────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Home  Work ▼  CRM ▼    🔍 Search...      Resources ▼  👤     │
└────────────────────────────────────────────────────────────────────────┘
                                    ↑ Always visible in center
```

### Option 2: Modal with Keyboard Shortcut
```
┌────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Home  Work ▼  CRM ▼  Resources ▼  Admin ▼    ⌘K  🔔  👤     │
└────────────────────────────────────────────────────────────────────────┘
                                                        ↑ Press Cmd+K to open
```

---

## Color Scheme (Light Mode)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Background: hsl(210, 20%, 98%)  - Very light gray                     │
│  Text: hsl(210, 15%, 20%)        - Dark gray                           │
│  Border: hsl(210, 15%, 88%)      - Light border                        │
│  Hover: hsl(210, 15%, 95%)       - Subtle hover                        │
│  Active: hsl(199, 100%, 43%)     - VRG Blue                            │
└────────────────────────────────────────────────────────────────────────┘
```

## Color Scheme (Dark Mode)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Background: hsl(210, 15%, 12%)  - Dark background                     │
│  Text: hsl(210, 20%, 98%)        - Light text                          │
│  Border: hsl(210, 15%, 20%)      - Dark border                         │
│  Hover: hsl(210, 15%, 18%)       - Subtle hover                        │
│  Active: hsl(199, 100%, 43%)     - VRG Blue (same)                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Animation & Transitions

### Menu Open/Close
- **Duration:** 200ms
- **Easing:** cubic-bezier(0.4, 0, 0.2, 1)
- **Effect:** Fade in + scale from 0.95 to 1.0

### Hover Effects
- **Duration:** 150ms
- **Effect:** Background color transition

### Active Page Indicator
- **Effect:** Underline slides in from left
- **Duration:** 300ms

---

## Advantages Over Sidebar

### Space Gained
- **Before:** Content width = Screen width - 288px (sidebar)
- **After:** Content width = Screen width (full)
- **Gain:** ~288px more horizontal space (20% more on 1440px screen!)

### Visual Comparison (1440px screen)

**Sidebar Layout:**
```
┌──────┬────────────────────────────────┐
│ Side │                                │
│ bar  │     Content (1152px)           │
│288px │                                │
└──────┴────────────────────────────────┘
```

**Top Nav Layout:**
```
┌────────────────────────────────────────┐
│ Top Nav (64px tall)                    │
├────────────────────────────────────────┤
│                                        │
│     Content (1440px - FULL WIDTH!)    │
│                                        │
└────────────────────────────────────────┘
```

### User Benefits
✅ More space for tables and dashboards
✅ Less horizontal scrolling
✅ Modern, familiar pattern (like most SaaS apps)
✅ Better for widescreen monitors
✅ Cleaner, less cluttered interface

---

## Technical Implementation Notes

### Component Structure
```tsx
<TopNavigationBar>
  <Logo />
  <GlobalSearch />
  <NavigationMenu>
    <MenuItem label="Home" href="/" />
    <MenuItem label="Work" dropdown={<WorkMegaMenu />} />
    <MenuItem label="CRM" dropdown={<CRMMegaMenu />} />
    <MenuItem label="Resources" dropdown={<ResourcesMegaMenu />} />
    <MenuItem label="Admin" dropdown={<AdminMegaMenu />} roleRequired="admin" />
  </NavigationMenu>
  <RightSection>
    <ExternalLinks />
    <NotificationsDropdown />
    <UserMenu />
  </RightSection>
</TopNavigationBar>
```

### State Management
- Menu open/close state: Local state per menu
- Active page: React Router location
- Role-based visibility: Existing useAuth hook
- Menu customization: Existing Supabase hooks

### Accessibility
- Full keyboard navigation
- ARIA labels and roles
- Focus management
- Screen reader announcements
