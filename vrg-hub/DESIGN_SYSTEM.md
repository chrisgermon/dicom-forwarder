# Design System Documentation

This document outlines the design system standards for the VRG Hub application. All components should follow these guidelines to ensure visual consistency.

## Table of Contents

- [Color System](#color-system)
- [Typography](#typography)
- [Spacing](#spacing)
- [Border Radius](#border-radius)
- [Shadows](#shadows)
- [Animations](#animations)
- [Component Standards](#component-standards)

---

## Color System

All colors are defined using HSL format in `/src/index.css` and exposed through Tailwind CSS tokens in `/tailwind.config.ts`.

### Primary Colors

```css
--primary: 199 100% 43%        /* Vision Radiology Blue */
--primary-foreground: 0 0% 100%
--primary-glow: 199 100% 53%
```

**Usage:** Primary actions, links, focus states, branding

**Tailwind classes:** `bg-primary`, `text-primary`, `border-primary`

### Semantic Colors

```css
--success: 142 76% 36%         /* Green for success states */
--warning: 38 92% 50%          /* Orange/Yellow for warnings */
--info: 199 89% 48%            /* Blue for informational states */
--destructive: 0 84% 60%       /* Red for errors/destructive actions */
--accent: 24 95% 53%           /* Orange accent color */
```

**Usage:**
- **Success:** Approved statuses, positive trends, success messages
- **Warning:** Alerts, warnings, pending states
- **Info:** Informational badges, tooltips, neutral alerts
- **Destructive:** Delete actions, error states, declined statuses
- **Accent:** Highlighted elements, call-to-actions

**Tailwind classes:** `bg-success`, `text-warning`, `border-destructive`, etc.

### Status Colors

```css
--status-draft: 210 10% 55%       /* Gray for drafts */
--status-submitted: 199 100% 43%  /* Blue for submitted */
--status-approved: 142 76% 36%    /* Green for approved */
--status-declined: 0 84% 60%      /* Red for declined */
--status-ordered: 199 100% 43%    /* Blue for ordered */
```

**Usage:** Request status badges, workflow indicators

**Tailwind classes:** `bg-status-approved`, `text-status-draft`, etc.

### Neutral Colors

```css
--background: 210 20% 98%      /* Light mode background */
--foreground: 210 15% 20%      /* Light mode text */
--muted: 210 15% 95%           /* Muted backgrounds */
--muted-foreground: 210 10% 45% /* Muted text */
--secondary: 210 15% 92%       /* Secondary backgrounds */
--border: 210 15% 88%          /* Border color */
```

### Dark Mode

All colors have dark mode equivalents that automatically apply when `.dark` class is present on the root element.

**Key differences:**
- Accent color maintains its orange hue in dark mode
- Status colors remain consistent between modes for recognition
- Background and foreground colors invert appropriately

---

## Typography

### Font Family

```typescript
fontFamily: {
  sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
}
```

**Usage:** Inter is the primary font for all text. System fonts serve as fallbacks.

### Font Sizes

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem (12px) | Small labels, badges, helper text |
| `text-sm` | 0.875rem (14px) | Body text, table cells, descriptions |
| `text-base` | 1rem (16px) | Default body text, form inputs |
| `text-lg` | 1.125rem (18px) | Large button text, subheadings |
| `text-xl` | 1.25rem (20px) | Card titles, section headers |
| `text-2xl` | 1.5rem (24px) | Page headers, rich text h1 |
| `text-3xl` | 1.875rem (30px) | Dashboard values, hero text |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-medium` | 500 | Buttons, labels, navigation items |
| `font-semibold` | 600 | Badges, card titles, emphasized text |
| `font-bold` | 700 | Dashboard values, important headings |

**Guidelines:**
- Use `font-medium` as the default for interactive elements
- Use `font-semibold` for section titles and emphasized content
- Reserve `font-bold` for data displays and hero sections

---

## Spacing

### Padding Scale

| Component Type | Padding Class | Value |
|----------------|---------------|-------|
| **Buttons** | | |
| Default | `px-6 py-2` | 1.5rem × 0.5rem |
| Small | `px-4` | 1rem |
| Large | `px-8` | 2rem |
| XL | `px-10` | 2.5rem |
| **Cards** | | |
| Header/Content/Footer | `p-6` | 1.5rem |
| Nested content | `pt-0` | 0 (inherits horizontal) |
| **Tables** | | |
| Table cells | `px-4 py-3` | 1rem × 0.75rem |
| Table headers | `px-4 py-3` | 1rem × 0.75rem |
| **Forms** | | |
| Input/Textarea | `px-4 py-2` | 1rem × 0.5rem |
| Dialog content | `p-6` | 1.5rem |

### Gap Scale

| Usage | Gap Class | Value |
|-------|-----------|-------|
| Tight spacing (pagination, breadcrumbs) | `gap-1` | 0.25rem |
| Default flexbox/grid spacing | `gap-2` | 0.5rem |
| Card grids | `gap-4` | 1rem |
| Section spacing | `gap-6` | 1.5rem |

**Guidelines:**
- Use `gap-2` as the default for most flex/grid layouts
- Use `gap-4` for card grids and larger component spacing
- Maintain consistent vertical rhythm using `space-y-*` utilities

---

## Border Radius

### Size Scale

| Variable | Value | Usage |
|----------|-------|-------|
| `rounded-sm` | 12px (`--radius - 4px`) | Small controls |
| `rounded-md` | 14px (`--radius - 2px`) | Default elements |
| `rounded-lg` | 16px (`--radius`) | Form inputs |
| `rounded-xl` | 20px (`--radius + 4px`) | Buttons, badges, inputs |
| `rounded-2xl` | 24px (`--radius + 8px`) | Cards, dialogs, modals |
| `rounded-full` | 9999px | Pills, circular buttons, avatars |

### Component Standards

| Component | Border Radius | Reasoning |
|-----------|---------------|-----------|
| **Buttons** | `rounded-xl` (20px) | All sizes use consistent xl radius |
| **Badges** | `rounded-xl` (20px) | Matches button consistency |
| **Cards** | `rounded-2xl` (24px) | Larger radius for prominent containers |
| **Dialogs/Modals** | `rounded-2xl` (24px) | Matches card styling |
| **Inputs/Textareas** | `rounded-xl` (20px) | Matches interactive elements |
| **Progress bars** | `rounded-full` | Smooth, continuous appearance |

**Guidelines:**
- Never mix border radius values on a single component
- Larger containers (cards, dialogs) use larger radii (2xl)
- Interactive elements (buttons, inputs) use xl
- Special cases (pills, avatars) use rounded-full

---

## Shadows

### Shadow Tokens

```css
--shadow-card: 0 4px 6px -1px hsl(210 15% 20% / 0.1),
               0 2px 4px -1px hsl(210 15% 20% / 0.06)

--shadow-elevated: 0 10px 15px -3px hsl(210 15% 20% / 0.1),
                   0 4px 6px -2px hsl(210 15% 20% / 0.05)

--shadow-glow: 0 0 20px hsl(199 100% 43% / 0.3)
```

### Tailwind Shadow Classes

| Class | Usage |
|-------|-------|
| `shadow-card` | Cards, default containers |
| `shadow-elevated` | Dialogs, popovers, dropdowns |
| `shadow-glow` | Special buttons, focus states (use sparingly) |
| `shadow-sm` | Subtle shadows on secondary buttons |
| `shadow-md` | Badges, small interactive elements |
| `shadow-lg` | Badge hover states |

### Component Standards

| Component | Default Shadow | Hover Shadow |
|-----------|----------------|--------------|
| **Card** | `shadow-card` | `shadow-elevated` |
| **Button (default)** | `shadow-sm` | `shadow-md` |
| **Badge** | `shadow-md` | `shadow-lg` |
| **Dialog** | `shadow-elevated` | - |

**Guidelines:**
- Use custom shadow tokens (`shadow-card`, `shadow-elevated`) instead of Tailwind defaults
- Hover shadows should be one step up from default
- Avoid excessive shadows - less is more

---

## Animations

### Timing Functions

```css
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
--transition-bounce: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

**Tailwind classes:** `transition-smooth`, `transition-bounce`

### Standard Animations

| Animation | Keyframe | Duration | Usage |
|-----------|----------|----------|-------|
| `fade-in` | opacity + translateY | 0.3s | Page loads, content reveals |
| `scale-in` | scale + opacity | 0.2s | Modal opens, popovers |
| `accordion-down/up` | height | 0.2s | Accordion expansions |

### Hover Animations

**Scale Animation (Standard)**
```css
hover:scale-[1.02]  /* Use this value consistently */
```

**Guidelines:**
- ALL hover scale animations should use `1.02` (2% increase)
- Never use `1.05` or other values
- Combine with shadow changes for depth: `hover:scale-[1.02] hover:shadow-lg`

### Transition Durations

| Duration | Usage |
|----------|-------|
| `duration-150` | Quick interactions (ghost button hovers) |
| `duration-200` | Standard transitions (buttons, links, colors) |
| `duration-300` | Smooth transitions (backgrounds, larger elements) |
| `duration-500` | Slow transitions (progress bars, data animations) |

**Guidelines:**
- Use `duration-200` as the default for most transitions
- Pair with `transition-all` for comprehensive changes
- Use `transition-colors` for color-only changes (more performant)

---

## Component Standards

### Buttons

**Variants:**
- `default` - Primary actions (blue background)
- `destructive` - Delete/remove actions (red background)
- `outline` - Secondary actions (border, no background)
- `secondary` - Tertiary actions (gray background)
- `ghost` - Minimal actions (transparent, hover only)
- `link` - Text links (underline on hover)

**Sizes:**
- `sm` - Small (h-9, px-4, text-xs)
- `default` - Default (h-11, px-6, py-2, text-sm)
- `lg` - Large (h-12, px-8, text-base)
- `xl` - Extra large (h-14, px-10, text-lg)
- `icon` - Square icon button (h-10, w-10)

**Guidelines:**
- All buttons use `rounded-xl`
- Icons inside buttons are automatically sized to `h-4 w-4`
- Use `font-medium` by default, `font-semibold` for xl size
- Never create custom button variants - use className overrides if absolutely necessary

### Badges

**Variants:**
- `default` - Primary badge (blue)
- `secondary` - Secondary badge (gray)
- `destructive` - Error/negative (red)
- `success` - Success/positive (green)
- `warning` - Warning/caution (orange)
- `info` - Informational (blue)
- `outline` - Bordered badge (transparent with border)

**Guidelines:**
- All badges use design tokens (no hardcoded colors)
- Standard size: `px-2.5 py-0.5 text-xs font-semibold`
- All badges use `rounded-xl`
- Hover effect: `hover:scale-[1.02] hover:shadow-lg`

### Cards

**Structure:**
```tsx
<Card>
  <CardHeader>     {/* p-6 */}
    <CardTitle />
    <CardDescription />
  </CardHeader>
  <CardContent>    {/* p-6 pt-0 */}
  </CardContent>
  <CardFooter>     {/* p-6 pt-0 */}
  </CardFooter>
</Card>
```

**Guidelines:**
- Cards use `rounded-2xl border border-border/50 shadow-card`
- Consistent padding: `p-6` for all sections
- Nested sections use `pt-0` to avoid double padding
- Use `shadow-card` for default, `shadow-elevated` on hover if interactive

### Forms

**Input Standards:**
- Height: `h-11` (matches button default height)
- Padding: `px-4 py-2`
- Border radius: `rounded-xl`
- Border: `border border-border/50`
- Background: `bg-muted/30`
- Focus state: `focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10`

**Label Standards:**
- Font size: `text-sm`
- Font weight: `font-medium`
- Color: `text-foreground`

### Tables

**Cell Spacing:**
- Table head: `h-12 px-4 py-3`
- Table cell: `px-4 py-3`
- Consistent horizontal and vertical padding

**Guidelines:**
- Use `text-sm` for all table content
- On mobile: Use `text-xs` (automatically applied via global CSS)
- Table headers use `font-medium text-muted-foreground`

---

## Best Practices

### DO:
✅ Use design tokens for all colors
✅ Use consistent spacing scale (multiples of 4px)
✅ Use `rounded-xl` for buttons, badges, inputs
✅ Use `rounded-2xl` for cards and dialogs
✅ Use `hover:scale-[1.02]` for all scale animations
✅ Use `shadow-card` and `shadow-elevated` custom shadows
✅ Use `transition-all duration-200` for most transitions
✅ Use `font-medium` for interactive elements

### DON'T:
❌ Hardcode colors (use design tokens)
❌ Mix border radius values on a component
❌ Use `hover:scale-105` or other scale values
❌ Create deprecated variants with hardcoded styles
❌ Use inline styles for static styling
❌ Mix `shadow-sm shadow-black/5` when `shadow-card` exists
❌ Use different padding in similar components
❌ Create custom font sizes outside the scale

---

## Migration Guide

If you're updating existing components:

1. **Replace hardcoded colors** with design tokens:
   ```tsx
   // Before
   className="bg-green-600 text-white"

   // After
   className="bg-success text-success-foreground"
   ```

2. **Standardize border radius**:
   ```tsx
   // Before
   <Button className="rounded-lg" />  {/* sm size only */}

   // After
   <Button className="rounded-xl" />  {/* all sizes */}
   ```

3. **Update scale animations**:
   ```tsx
   // Before
   className="hover:scale-105"

   // After
   className="hover:scale-[1.02]"
   ```

4. **Use shadow tokens**:
   ```tsx
   // Before
   className="shadow-sm shadow-black/5"

   // After
   className="shadow-card"
   ```

---

## Questions?

If you're unsure which variant, color, or size to use:
- Check existing similar components in the codebase
- Refer to this documentation
- When in doubt, use the defaults (default variant, default size, primary color)

Last updated: 2026-01-02
