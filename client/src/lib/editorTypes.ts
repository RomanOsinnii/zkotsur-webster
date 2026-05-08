import { FabricObject } from 'fabric';

export type FramePreset = {
  name: string;
  description: string;
  width: number;
  height: number;
};

export type GalleryTemplate = {
  id: string;
  title: string;
  subtitle: string;
  width: number;
  height: number;
  size: string;
  toneClass: string;
  illustrationClass: string;
};

export type FillMode = 'solid' | 'gradient';
export type ToolMode = 'select' | 'text' | 'box' | 'circle' | 'shape' | 'image';

export type GradientStopItem = {
  id: string;
  offset: number;
  color: string;
  opacity: number;
};

export type FillLayer = {
  id: string;
  mode: FillMode;
  color: string;
  opacity: number;
  stops: GradientStopItem[];
};

export type CornerRadii = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

export type DesignFrame = FramePreset & {
  id: string;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundMode: FillMode;
  backgroundStops: GradientStopItem[];
  json?: Record<string, unknown>;
};

export type LayerItem = {
  index: number;
  id: string;
  name: string;
  type: string;
  active: boolean;
  visible?: boolean;
};

export type WebsterObject = FabricObject & {
  objectId?: string;
  objectName?: string;
  cornerRadii?: CornerRadii;
  shapeKind?: string;
  fillLayers?: FillLayer[];
};

export type FrameHistory = {
  undo: Record<string, unknown>[];
  redo: Record<string, unknown>[];
};

export type SnapLine = {
  direction: 'horizontal' | 'vertical';
  position: number;
  targetPosition: number;
  targetObjectId?: string;
};

export type CornerHandle = {
  key: keyof CornerRadii;
  left: number;
  top: number;
  cursor: string;
};

export type ResizeHandle = {
  key: keyof CornerRadii;
  left: number;
  top: number;
  cursor: string;
};

export type EditorProject = {
  frames: DesignFrame[];
};

export type SidebarPanel = 'templates' | 'uploads' | 'elements' | 'text' | 'photos' | 'styles' | 'learn';
export type AuthMode = 'login' | 'register';

export const presets: FramePreset[] = [
  { name: 'Instagram Post', description: 'Social media square', width: 1080, height: 1080 },
  { name: 'Presentation', description: 'Wide slide', width: 1280, height: 720 },
  { name: 'Poster', description: 'Print-friendly layout', width: 900, height: 1200 }
];

export const galleryTemplates: GalleryTemplate[] = [
  { id: 'instagram-post', title: 'Instagram Post', subtitle: 'Social network post', width: 1080, height: 1080, size: '1080 x 1080', toneClass: 'gallery-tone-1', illustrationClass: 'ill-instagram' },
  { id: 'instagram-story', title: 'Instagram Story', subtitle: 'Story mockup', width: 1080, height: 1920, size: '1080 x 1920', toneClass: 'gallery-tone-2', illustrationClass: 'ill-phone' },
  { id: 'facebook-cover', title: 'Facebook Cover', subtitle: 'Page cover banner', width: 820, height: 312, size: '820 x 312', toneClass: 'gallery-tone-3', illustrationClass: 'ill-cover' },
  { id: 'youtube-thumb', title: 'YouTube Thumbnail', subtitle: 'Video preview', width: 1280, height: 720, size: '1280 x 720', toneClass: 'gallery-tone-4', illustrationClass: 'ill-youtube' },
  { id: 'collage', title: 'Photo Collages', subtitle: 'Grid photo collage', width: 1080, height: 1080, size: '1080 x 1080', toneClass: 'gallery-tone-5', illustrationClass: 'ill-collage' },
  { id: 'greeting', title: 'Greeting Card', subtitle: 'Invite and congratulate', width: 1200, height: 800, size: '1200 x 800', toneClass: 'gallery-tone-6', illustrationClass: 'ill-greeting' },
  { id: 'invitation', title: 'Invitation', subtitle: 'Event invitation', width: 1080, height: 1350, size: '1080 x 1350', toneClass: 'gallery-tone-7', illustrationClass: 'ill-invitation' },
  { id: 'postcard', title: 'Postcard', subtitle: 'Ready postcard design', width: 1480, height: 1050, size: '1480 x 1050', toneClass: 'gallery-tone-8', illustrationClass: 'ill-postcard' }
];

export const exportProperties = ['objectId', 'objectName', 'cornerRadii', 'shapeKind', 'fillLayers'];
export const maxHistorySteps = 6;
export const snapThreshold = 8;
export const defaultProjectName = 'Untitled project';

export const fontOptions = [
  { label: 'Inter', value: 'Inter, Segoe UI, sans-serif' },
  { label: 'Segoe UI', value: 'Segoe UI, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Courier New', value: 'Courier New, monospace' }
];

export const cornerFields: { key: keyof CornerRadii; label: string }[] = [
  { key: 'topLeft', label: 'Top left' },
  { key: 'topRight', label: 'Top right' },
  { key: 'bottomRight', label: 'Bottom right' },
  { key: 'bottomLeft', label: 'Bottom left' }
];

export function getTemplateToneClass(index: number) {
  const toneIndex = (index % 8) + 1;
  return `template-tone-${toneIndex}`;
}

export function getTemplatePreviewClass(frame: DesignFrame, index: number) {
  const ratio = frame.width / frame.height;
  const shape = ratio > 1.2 ? 'landscape' : ratio < 0.9 ? 'portrait' : 'square';
  const tone = (index % 8) + 1;
  return `template-thumb-${shape} template-thumb-tone-${tone}`;
}

export function createId() {
  const randomUuid = globalThis.crypto?.randomUUID;
  if (typeof randomUuid === 'function') {
    return randomUuid.call(globalThis.crypto);
  }

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
