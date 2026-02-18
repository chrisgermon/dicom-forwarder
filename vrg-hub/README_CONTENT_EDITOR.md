# CrowdHub Visual Content Editor Guide

CrowdHub includes a built-in visual content editor inspired by TinaCMS, allowing you to edit page content directly with a beautiful visual interface.

## Features

- **Visual Sidebar**: Browse all editable sections from a left sidebar
- **Blue Dotted Borders**: See exactly what's editable with visual boundaries
- **Click-to-Edit**: Click any section to open the editing panel
- **Right Panel Editor**: Edit fields in a dedicated panel on the right
- **Unsaved Changes Tracking**: See when you have changes that need saving
- **Live Preview**: See your changes in real-time as you edit

## How to Use

### Starting the Visual Editor

1. Navigate to the Home page (`/home`)
2. Click the **"Edit with Visual Editor"** button
3. The visual editor interface will appear with:
   - **Left Sidebar**: Lists all editable sections
   - **Main Content**: Shows your page with blue dotted borders around editable areas
   - **Right Panel**: Opens when you click a section to edit

### Editing Content

1. **Browse Sections**: Look at the left sidebar to see all available sections
2. **Select a Section**: Click on a section name in the sidebar or click directly on the content
3. **Edit Fields**: Use the right panel to edit:
   - Text fields (title, labels, etc.)
   - Textarea fields (descriptions, paragraphs)
   - Image URLs (background images, photos)
4. **See Changes Live**: Your changes appear immediately in the preview
5. **Save or Reset**:
   - Click **"Save Changes"** to persist your edits
   - Click **"Reset"** to discard changes

### Visual Indicators

- **Blue Dotted Border**: Indicates an editable section
- **Section Label**: Appears when hovering over a section
- **Orange Dot**: Shows unsaved changes in the sidebar
- **Active Highlight**: Selected section has a blue ring

### Keyboard Shortcuts

- **ESC**: Close the visual editor
- **Ctrl/Cmd + S**: Save changes (when focused in editor)

## Editable Sections

### Home Page

1. **Hero Section**
   - Hero Title: Main heading text
   - Hero Subtitle: Description text below the title
   - Background Image: URL to the hero background image

2. **Content Widgets**
   - Managed through the Advanced Editor
   - Visible as a section in the visual editor

## Advanced Layout Editing

For complex layout changes:

1. Close the visual editor
2. Click **"Advanced Editor"** button
3. Use the drag-and-drop interface to:
   - Add new widgets
   - Rearrange existing content
   - Resize components
   - Configure widget settings

The visual editor is best for quick content changes, while the advanced editor is for layout modifications.

## Interface Layout

```
┌─────────────────┬──────────────────────────┬─────────────────┐
│                 │                          │                 │
│  LEFT SIDEBAR   │     MAIN CONTENT         │  RIGHT PANEL    │
│                 │                          │                 │
│  - Pages        │  [Editable Section]      │  Section Editor │
│  - Sections     │  with dotted borders     │  - Field 1      │
│  - Save/Reset   │                          │  - Field 2      │
│                 │  [Another Section]       │  - Field 3      │
│                 │                          │                 │
└─────────────────┴──────────────────────────┴─────────────────┘
```

## Technical Details

### Architecture

The visual editor uses:
- `VisualEditorSidebar`: Left sidebar showing sections and actions
- `VisualEditorPanel`: Right panel for editing fields
- `EditableSection`: Wrapper component that adds visual editing boundaries
- `FieldEditor`: Form fields for different content types
- `InlineEditContext`: React context managing edit state

### Data Flow

1. User enters edit mode
2. Sections are wrapped with `EditableSection` components
3. Click a section → opens right panel with fields
4. Edit fields → updates local state
5. Changes tracked automatically
6. Save → persists to Supabase database
7. Reset → reverts to last saved state

### Database Schema

Content is stored in `company_home_pages`:
- `hero_title`: Main hero section title
- `hero_subtitle`: Hero section subtitle
- `hero_background`: URL to background image
- `layout_config`: JSON configuration for widgets

## Extending the Editor

To make other pages editable:

### 1. Wrap Sections with EditableSection

```tsx
import { EditableSection } from "@/components/visual-editor/EditableSection";

<EditableSection
  id="my-section"
  label="My Section"
  isActive={activeSection === "my-section"}
  onClick={() => setActiveSection("my-section")}
>
  <div>Your content here</div>
</EditableSection>
```

### 2. Define Section Fields

```tsx
const sections = [
  { id: "my-section", label: "My Section", type: "custom" }
];

const getFields = () => {
  if (activeSection === "my-section") {
    return [
      { name: "title", label: "Title", type: "text", value: title },
      { name: "content", label: "Content", type: "textarea", value: content },
    ];
  }
  return [];
};
```

### 3. Handle Field Changes

```tsx
const handleFieldChange = (sectionId, fieldName, value) => {
  if (sectionId === "my-section") {
    if (fieldName === "title") setTitle(value);
    if (fieldName === "content") setContent(value);
  }
};
```

## Benefits Over Traditional CMS

- **No External Services**: Everything runs in CrowdHub
- **Fast**: Instant feedback as you edit
- **Integrated**: Works with existing auth and permissions
- **Git-Friendly**: Content stored in database, not files
- **Customizable**: Easy to extend with new field types

## Access Control

Only users with the `edit_home_page` permission can use the visual editor:
- Tenant Admins
- Super Admins
- Managers (with permission)

## CMS Options

CrowdHub now uses Decap CMS for content management. See `README_DECAP_CMS.md` for full setup instructions.

| Feature | Built-in Inline Editor | Decap CMS |
|---------|----------------|---------|
| Visual editing | ✅ | ✅ |
| Sidebar navigation | ✅ | ✅ |
| Dotted borders | ✅ | ✅ |
| External service | ❌ | ✅ |
| Git-based | ❌ | ✅ |
| Database storage | ✅ | ❌ |
| Custom integration | ✅ | ⚠️ |

## Support

For help:
1. Check `/content-editor` for documentation
2. Contact your system administrator
3. Refer to this guide

## Future Enhancements

Planned features:
- ✨ More editable pages (News, Knowledge Base)
- 🎨 Custom field types (color picker, rich text)
- 📱 Mobile editing interface
- 🔄 Undo/redo functionality
- 📋 Content templates
- 🌐 Multi-language support
