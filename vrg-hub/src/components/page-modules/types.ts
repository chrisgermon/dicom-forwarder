export type ModuleType = 'quick_links' | 'image_gallery' | 'file_browser' | 'rich_text' | 'link_buttons' | 'divider' | 'accordion' | 'callout' | 'video_embed' | 'contact_cards' | 'embed_code';

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  description?: string;
}

export interface ImageItem {
  id: string;
  url: string;
  caption?: string;
}

export interface QuickLinksContent {
  links: QuickLink[];
}

export interface ImageGalleryContent {
  images: ImageItem[];
  layout: 'grid' | 'carousel';
}

export interface FileBrowserContent {
  folder_id: string | null;
  folder_name: string | null;
}

export interface RichTextContent {
  html: string;
}

export interface LinkButton {
  id: string;
  title: string;
  url: string;
  gradient: string;
}

export interface LinkButtonsContent {
  buttons: LinkButton[];
}

// New module types
export interface DividerContent {
  style: 'solid' | 'dashed' | 'dotted' | 'gradient';
  spacing: 'sm' | 'md' | 'lg';
}

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
  isOpen?: boolean;
}

export interface AccordionContent {
  items: AccordionItem[];
  allowMultiple: boolean;
}

export interface CalloutContent {
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  icon?: string;
}

export interface VideoEmbedContent {
  url: string;
  title?: string;
  aspectRatio: '16:9' | '4:3' | '1:1';
}

export interface ContactCard {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
}

export interface ContactCardsContent {
  cards: ContactCard[];
  layout: 'grid' | 'list';
}

export interface EmbedCodeContent {
  code: string;
  height?: number;
}

export type ModuleContent = 
  | QuickLinksContent 
  | ImageGalleryContent 
  | FileBrowserContent 
  | RichTextContent 
  | LinkButtonsContent
  | DividerContent
  | AccordionContent
  | CalloutContent
  | VideoEmbedContent
  | ContactCardsContent
  | EmbedCodeContent;

export type ColumnSpan = 4 | 6 | 8 | 12;

export interface PageModule {
  id: string;
  page_id: string;
  module_type: ModuleType;
  title: string | null;
  content: ModuleContent;
  sort_order: number;
  column_span: ColumnSpan;
  row_index: number;
  created_at: string;
  updated_at: string;
}

export const COLUMN_SPAN_OPTIONS: { value: ColumnSpan; label: string }[] = [
  { value: 4, label: '1/3 Width' },
  { value: 6, label: '1/2 Width' },
  { value: 8, label: '2/3 Width' },
  { value: 12, label: 'Full Width' },
];

export const MODULE_LABELS: Record<ModuleType, string> = {
  quick_links: 'Quick Links',
  image_gallery: 'Image Gallery',
  file_browser: 'File Browser',
  rich_text: 'Rich Text',
  link_buttons: 'Link Buttons',
  divider: 'Divider',
  accordion: 'Accordion',
  callout: 'Callout Box',
  video_embed: 'Video Embed',
  contact_cards: 'Contact Cards',
  embed_code: 'Embed Code',
};

export const MODULE_CATEGORIES: Record<string, { label: string; modules: ModuleType[] }> = {
  content: {
    label: 'Content',
    modules: ['rich_text', 'accordion', 'callout'],
  },
  media: {
    label: 'Media',
    modules: ['image_gallery', 'video_embed', 'embed_code'],
  },
  navigation: {
    label: 'Navigation & Links',
    modules: ['quick_links', 'link_buttons', 'file_browser'],
  },
  layout: {
    label: 'Layout',
    modules: ['divider', 'contact_cards'],
  },
};

export const getDefaultContent = (type: ModuleType): ModuleContent => {
  switch (type) {
    case 'quick_links':
      return { links: [] };
    case 'image_gallery':
      return { images: [], layout: 'grid' };
    case 'file_browser':
      return { folder_id: null, folder_name: null };
    case 'rich_text':
      return { html: '' };
    case 'link_buttons':
      return { buttons: [] };
    case 'divider':
      return { style: 'solid', spacing: 'md' };
    case 'accordion':
      return { items: [], allowMultiple: false };
    case 'callout':
      return { type: 'info', title: '', message: '' };
    case 'video_embed':
      return { url: '', aspectRatio: '16:9' };
    case 'contact_cards':
      return { cards: [], layout: 'grid' };
    case 'embed_code':
      return { code: '', height: 300 };
  }
};
