import { ChangeEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, useEffect, useRef, useState } from 'react';
import { Canvas, Circle, FabricImage, FabricObject, Path, Pattern, Point, Rect, Textbox, Triangle } from 'fabric';
import { Circle as CircleIcon, Download, GraduationCap, Grid3X3, ImagePlus, MousePointer2, Plus, Shapes, Sparkles, Square, Trash2, Triangle as TriangleIcon, Type, Upload } from 'lucide-react';
import JSZip from 'jszip';
import owlMascot from './public/owl.png';

type FramePreset = {
  name: string;
  description: string;
  width: number;
  height: number;
};

type GalleryTemplate = {
  id: string;
  title: string;
  subtitle: string;
  size: string;
  toneClass: string;
  illustrationClass: string;
};

type DesignFrame = FramePreset & {
  id: string;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundMode: FillMode;
  backgroundStops: GradientStopItem[];
  json?: Record<string, unknown>;
};

type LayerItem = {
  index: number;
  id: string;
  name: string;
  type: string;
  active: boolean;
};

type FillMode = 'solid' | 'gradient';
type ToolMode = 'select' | 'text' | 'box' | 'circle' | 'shape' | 'image';
type FillLayer = {
  id: string;
  mode: FillMode;
  color: string;
  opacity: number;
  stops: GradientStopItem[];
};
type CornerRadii = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};
type GradientStopItem = {
  id: string;
  offset: number;
  color: string;
  opacity: number;
};
type WebsterObject = FabricObject & {
  objectId?: string;
  objectName?: string;
  cornerRadii?: CornerRadii;
  shapeKind?: string;
  fillLayers?: FillLayer[];
};
type FrameHistory = {
  undo: Record<string, unknown>[];
  redo: Record<string, unknown>[];
};

type SnapLine = {
  direction: 'horizontal' | 'vertical';
  position: number;
  targetPosition: number;
  targetObjectId?: string;
};
type CornerHandle = {
  key: keyof CornerRadii;
  left: number;
  top: number;
  cursor: string;
};
type ResizeHandle = {
  key: keyof CornerRadii;
  left: number;
  top: number;
  cursor: string;
};

const presets: FramePreset[] = [
  { name: 'Instagram Post', description: 'Social media square', width: 1080, height: 1080 },
  { name: 'Presentation', description: 'Wide slide', width: 1280, height: 720 },
  { name: 'Poster', description: 'Print-friendly layout', width: 900, height: 1200 }
];
const galleryTemplates: GalleryTemplate[] = [
  { id: 'instagram-post', title: 'Instagram Post', subtitle: 'Social network post', size: '1080 x 1080', toneClass: 'gallery-tone-1', illustrationClass: 'ill-instagram' },
  { id: 'instagram-story', title: 'Instagram Story', subtitle: 'Story mockup', size: '1080 x 1920', toneClass: 'gallery-tone-2', illustrationClass: 'ill-phone' },
  { id: 'facebook-cover', title: 'Facebook Cover', subtitle: 'Page cover banner', size: '820 x 312', toneClass: 'gallery-tone-3', illustrationClass: 'ill-cover' },
  { id: 'youtube-thumb', title: 'YouTube Thumbnail', subtitle: 'Video preview', size: '1280 x 720', toneClass: 'gallery-tone-4', illustrationClass: 'ill-youtube' },
  { id: 'collage', title: 'Photo Collages', subtitle: 'Grid photo collage', size: '1080 x 1080', toneClass: 'gallery-tone-5', illustrationClass: 'ill-collage' },
  { id: 'greeting', title: 'Greeting Card', subtitle: 'Invite and congratulate', size: '1200 x 800', toneClass: 'gallery-tone-6', illustrationClass: 'ill-greeting' },
  { id: 'invitation', title: 'Invitation', subtitle: 'Event invitation', size: '1080 x 1350', toneClass: 'gallery-tone-7', illustrationClass: 'ill-invitation' },
  { id: 'postcard', title: 'Postcard', subtitle: 'Ready postcard design', size: '1480 x 1050', toneClass: 'gallery-tone-8', illustrationClass: 'ill-postcard' }
];
const exportProperties = ['objectId', 'objectName', 'cornerRadii', 'shapeKind', 'fillLayers'];
const maxHistorySteps = 6;
const snapThreshold = 8;
const fontOptions = [
  { label: 'Inter', value: 'Inter, Segoe UI, sans-serif' },
  { label: 'Segoe UI', value: 'Segoe UI, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Courier New', value: 'Courier New, monospace' }
];
const cornerFields: { key: keyof CornerRadii; label: string }[] = [
  { key: 'topLeft', label: 'Top left' },
  { key: 'topRight', label: 'Top right' },
  { key: 'bottomRight', label: 'Bottom right' },
  { key: 'bottomLeft', label: 'Bottom left' }
];

function getTemplateToneClass(index: number) {
  const toneIndex = (index % 8) + 1;
  return `template-tone-${toneIndex}`;
}

function getTemplatePreviewClass(frame: DesignFrame, index: number) {
  const ratio = frame.width / frame.height;
  const shape = ratio > 1.2 ? 'landscape' : ratio < 0.9 ? 'portrait' : 'square';
  const tone = (index % 8) + 1;
  return `template-thumb-${shape} template-thumb-tone-${tone}`;
}

function createId() {
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

  // RFC 4122 variant 4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const initialFrames: DesignFrame[] = presets.map((preset, index) => ({
  ...preset,
  id: createId(),
  name: index === 0 ? 'Instagram' : preset.name,
  backgroundColor: '#ffffff',
  backgroundOpacity: 1,
  backgroundMode: 'solid',
  backgroundStops: createDefaultGradientStops('#ffffff', '#d9d9d9')
}));

export default function App() {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const activeFrameRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const framesRef = useRef<DesignFrame[]>(initialFrames);
  const historyRef = useRef<Record<string, FrameHistory>>({});
  const isRestoringRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const drawingObjectRef = useRef<WebsterObject | null>(null);
  const drawStartRef = useRef({ x: 0, y: 0 });
  const clipboardObjectRef = useRef<WebsterObject | null>(null);
  const activeToolRef = useRef<ToolMode>('select');
  const spacePressedRef = useRef(false);
  const gridCursorTargetRef = useRef({ x: 0, y: 0 });
  const gridCursorCurrentRef = useRef({ x: 0, y: 0 });
  const gridCursorAnimationRef = useRef<number | null>(null);
  const styleSettingsRef = useRef({
    cornerRadii: {
      topLeft: 14,
      topRight: 14,
      bottomRight: 14,
      bottomLeft: 14
    },
    fillColor: '#1f2937',
    fillOpacity: 1,
    fontFamily: 'Inter, Segoe UI, sans-serif',
    fontSize: 56
  });

  const [frames, setFrames] = useState<DesignFrame[]>(initialFrames);
  const [activeFrameId, setActiveFrameId] = useState(initialFrames[1].id);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedObject, setSelectedObject] = useState<WebsterObject | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [fillColor, setFillColor] = useState('#1f2937');
  const [fillOpacity, setFillOpacity] = useState(1);
  const [fillMode, setFillMode] = useState<FillMode>('solid');
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(56);
  const [fontFamily, setFontFamily] = useState('Inter, Segoe UI, sans-serif');
  const [cornerRadii, setCornerRadii] = useState<CornerRadii>({
    topLeft: 14,
    topRight: 14,
    bottomRight: 14,
    bottomLeft: 14
  });
  const [gradientStops, setGradientStops] = useState<GradientStopItem[]>([
    { id: createId(), offset: 0, color: '#111827', opacity: 1 },
    { id: createId(), offset: 1, color: '#ffffff', opacity: 1 }
  ]);
  const [fillLayers, setFillLayers] = useState<FillLayer[]>([
    createFillLayer('solid', '#1f2937', 1)
  ]);
  const [activeFillLayerId, setActiveFillLayerId] = useState<string>('');
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [cornerHandles, setCornerHandles] = useState<CornerHandle[]>([]);
  const [resizeHandles, setResizeHandles] = useState<ResizeHandle[]>([]);
  const [workspaceZoom, setWorkspaceZoom] = useState(0.62);
  const [workspacePan, setWorkspacePan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [frameWidthInput, setFrameWidthInput] = useState('');
  const [frameHeightInput, setFrameHeightInput] = useState('');
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [workspaceMode, setWorkspaceMode] = useState<'templates' | 'editor'>('templates');

  const activeFrame = frames.find((frame) => frame.id === activeFrameId) ?? frames[0];
  const zoomPercent = Math.round(workspaceZoom * 100);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    setFrameWidthInput(String(activeFrame.width));
    setFrameHeightInput(String(activeFrame.height));
  }, [activeFrame.id, activeFrame.width, activeFrame.height]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    spacePressedRef.current = spacePressed;
  }, [spacePressed]);

  useEffect(() => {
    return () => {
      if (gridCursorAnimationRef.current !== null) {
        window.cancelAnimationFrame(gridCursorAnimationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    styleSettingsRef.current = {
      cornerRadii,
      fillColor,
      fillOpacity,
      fontFamily,
      fontSize
    };
  }, [cornerRadii, fillColor, fillOpacity, fontFamily, fontSize]);

  useEffect(() => {
    if (!canvasElementRef.current) {
      return undefined;
    }

    const frame = framesRef.current.find((item) => item.id === activeFrameId) ?? framesRef.current[0];
    const canvas = new Canvas(canvasElementRef.current, {
      width: frame.width,
      height: frame.height,
      backgroundColor: getFrameBackgroundFill(frame),
      preserveObjectStacking: true,
      selection: true
    });
    fabricCanvasRef.current = canvas;

    const sync = () => {
      const active = canvas.getActiveObject() as WebsterObject | undefined;
      setSelectedObject(active ?? null);
      setLayers(getLayers(canvas, active ?? null));
      setCornerHandles(active && isCornerEditable(active) ? getCornerHandles(active) : []);
      setResizeHandles(active ? getResizeHandles(active) : []);
      if (active) {
        const fill = active.get('fill');
        const activeOpacity = active.get('opacity');
        const nextFontSize = active.get('fontSize');
        const nextFontFamily = active.get('fontFamily');
        const nextTextAlign = active.get('textAlign');
        const objectFillLayers = getObjectFillLayers(active);
        const currentLayer = objectFillLayers[0];
        setFillLayers(objectFillLayers);
        setActiveFillLayerId(currentLayer.id);
        setFillColor(currentLayer.color);
        setFillOpacity(currentLayer.opacity);
        setFillMode(currentLayer.mode);
        setGradientStops(currentLayer.stops);
        setOpacity(typeof activeOpacity === 'number' ? activeOpacity : 1);
        setCornerRadii(getObjectCornerRadii(active));
        if (typeof nextFontSize === 'number') setFontSize(nextFontSize);
        if (typeof nextFontFamily === 'string') setFontFamily(nextFontFamily);
        if (typeof nextTextAlign === 'string') setTextAlign(nextTextAlign as 'left' | 'center' | 'right');
        
        // Update width and height
        const bounds = active.getBoundingRect();
        setElementWidth(Math.round(bounds.width));
        setElementHeight(Math.round(bounds.height));
      }
    };

    async function loadFrame() {
      if (frame.json) {
        await canvas.loadFromJSON(frame.json);
        ensureObjectIds(canvas);
      } else {
        addStarterObjects(canvas, frame);
      }
      setCanvasBackground(canvas, getFrameBackgroundFill(frame));
      sync();
      persistFrameJson(frame.id, toCanvasJson(canvas));
      historyRef.current[frame.id] = {
        undo: [toCanvasJson(canvas)],
        redo: []
      };
      canvas.requestRenderAll();
    }

    canvas.on('selection:created', sync);
    canvas.on('selection:updated', sync);
    canvas.on('selection:cleared', sync);
    canvas.on('object:added', ({ target }) => {
      configureSelectionOutline(target as WebsterObject | undefined);
    });
    canvas.on('object:added', sync);
    canvas.on('object:removed', sync);
    canvas.on('mouse:down', (event) => {
      const pointerEvent = event.e as MouseEvent | undefined;
      const tool = activeToolRef.current;
      if (!pointerEvent || tool === 'select' || tool === 'image' || spacePressedRef.current) return;
      const pointer = getCanvasPointer(canvas, pointerEvent);
      if (!pointer) return;
      if (tool === 'text') {
        addTextAt(pointer.x, pointer.y);
        setActiveTool('select');
        return;
      }
      const object = createDrawableObject(tool, pointer.x, pointer.y);
      if (!object) return;
      drawingObjectRef.current = object;
      drawStartRef.current = pointer;
      canvas.add(object);
      canvas.setActiveObject(object);
      canvas.selection = false;
    });
    canvas.on('mouse:move', (event) => {
      const object = drawingObjectRef.current;
      const pointerEvent = event.e as MouseEvent | undefined;
      if (!object || !pointerEvent) return;
      const pointer = getCanvasPointer(canvas, pointerEvent);
      if (!pointer) return;
      resizeDrawableObject(object, drawStartRef.current, pointer);
      canvas.requestRenderAll();
    });
    canvas.on('mouse:up', () => {
      const object = drawingObjectRef.current;
      if (!object) return;
      drawingObjectRef.current = null;
      canvas.selection = true;
      normalizeDrawableObject(object);
      canvas.setActiveObject(object);
      setSelectedObject(object);
      setLayers(getLayers(canvas, object));
      setActiveTool('select');
      saveCurrentFrame(true);
    });
    canvas.on('object:moving', (event) => {
      snapMovingObject(canvas, event.target as WebsterObject | undefined, setSnapLines);
      setCornerHandles([]);
      setResizeHandles([]);
    });
    canvas.on('object:modified', () => {
      setSnapLines([]);
      sync();
      saveCurrentFrame(true);
    });
    canvas.on('selection:cleared', () => {
      setSnapLines([]);
      setCornerHandles([]);
      setResizeHandles([]);
    });
    void loadFrame();

    return () => {
      fabricCanvasRef.current = null;
      void canvas.dispose();
    };
  }, [activeFrameId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditingField = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable;
      if (isEditingField) return;
      const key = event.key.toLowerCase();
      if (key === ' ') {
        event.preventDefault();
        setSpacePressed(true);
        return;
      }
      if (key === 'backspace' || key === 'delete') {
        event.preventDefault();
        removeSelected();
      }
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        if (key === 'v') {
          event.preventDefault();
          setActiveTool('select');
        }
        if (key === 't') {
          event.preventDefault();
          setActiveTool('text');
        }
        if (key === 'b' || key === 'r') {
          event.preventDefault();
          setActiveTool('box');
        }
        if (key === 'c') {
          event.preventDefault();
          setActiveTool('circle');
        }
        if (key === 'p') {
          event.preventDefault();
          setActiveTool('shape');
        }
        if (key === 'i') {
          event.preventDefault();
          fileInputRef.current?.click();
        }
      }
      if (!event.ctrlKey && !event.metaKey) return;
      if (key === 'c') {
        event.preventDefault();
        void copySelected();
      }
      if (key === 'v') {
        event.preventDefault();
        void pasteSelected();
      }
      if (key === 'z') {
        event.preventDefault();
        undoFrame();
      }
      if (key === 'y') {
        event.preventDefault();
        redoFrame();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        setSpacePressed(false);
        isPanningRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeFrameId]);

  const persistFrameJson = (frameId: string, json: Record<string, unknown>) => {
    const nextFrames = framesRef.current.map((frame) => (frame.id === frameId ? { ...frame, json } : frame));
    framesRef.current = nextFrames;
    setFrames(nextFrames);
  };

  const updateActiveFrame = (patch: Partial<Pick<DesignFrame, 'width' | 'height' | 'backgroundColor' | 'backgroundOpacity' | 'backgroundMode' | 'backgroundStops'>>) => {
    const nextFrames = framesRef.current.map((frame) => (frame.id === activeFrameId ? { ...frame, ...patch } : frame));
    framesRef.current = nextFrames;
    setFrames(nextFrames);
  };

  const saveCurrentFrame = (recordHistory = false) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const json = toCanvasJson(canvas);
    persistFrameJson(activeFrameId, json);
    if (!recordHistory || isRestoringRef.current) return;
    pushHistory(activeFrameId, json);
  };

  const pushHistory = (frameId: string, json: Record<string, unknown>) => {
    const current = historyRef.current[frameId] ?? { undo: [], redo: [] };
    const last = current.undo[current.undo.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(json)) return;
    historyRef.current[frameId] = {
      undo: [...current.undo, json].slice(-maxHistorySteps),
      redo: []
    };
  };

  const restoreFrameJson = async (json: Record<string, unknown>) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    isRestoringRef.current = true;
    canvas.discardActiveObject();
    await canvas.loadFromJSON(json);
    ensureObjectIds(canvas);
    canvas.requestRenderAll();
    setSelectedObject(null);
    setLayers(getLayers(canvas, null));
    setCornerHandles([]);
    setResizeHandles([]);
    persistFrameJson(activeFrameId, json);
    isRestoringRef.current = false;
  };

  const undoFrame = () => {
    const history = historyRef.current[activeFrameId];
    if (!history || history.undo.length <= 1) return;
    const current = history.undo[history.undo.length - 1];
    const previous = history.undo[history.undo.length - 2];
    historyRef.current[activeFrameId] = {
      undo: history.undo.slice(0, -1),
      redo: [current, ...history.redo].slice(0, 5)
    };
    void restoreFrameJson(previous);
  };

  const redoFrame = () => {
    const history = historyRef.current[activeFrameId];
    if (!history || history.redo.length === 0) return;
    const next = history.redo[0];
    historyRef.current[activeFrameId] = {
      undo: [...history.undo, next].slice(-maxHistorySteps),
      redo: history.redo.slice(1)
    };
    void restoreFrameJson(next);
  };

  const setZoom = (value: number, anchor?: { x: number; y: number }) => {
    const stage = canvasStageRef.current;
    const nextZoom = clampZoom(value);
    if (!stage || !anchor) {
      setWorkspaceZoom(nextZoom);
      return;
    }
    const stageRect = stage.getBoundingClientRect();
    const baseLeft = stageRect.left + stageRect.width / 2 - activeFrame.width / 2;
    const baseTop = stageRect.top + stageRect.height / 2 - activeFrame.height / 2;
    setWorkspaceZoom((currentZoom) => {
      setWorkspacePan((currentPan) => {
        const localX = (anchor.x - baseLeft - currentPan.x) / currentZoom;
        const localY = (anchor.y - baseTop - currentPan.y) / currentZoom;
        return {
          x: anchor.x - baseLeft - localX * nextZoom,
          y: anchor.y - baseTop - localY * nextZoom
        };
      });
      return nextZoom;
    });
  };

  const handleWorkspaceWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const multiplier = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom(workspaceZoom * multiplier, { x: event.clientX, y: event.clientY });
  };

  const updateGridCursorTarget = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = canvasStageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const y = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
    gridCursorTargetRef.current = { x, y };
  };

  const animateGridCursor = () => {
    const stage = canvasStageRef.current;
    if (!stage) {
      gridCursorAnimationRef.current = null;
      return;
    }
    const target = gridCursorTargetRef.current;
    const current = gridCursorCurrentRef.current;
    const nextX = current.x + (target.x - current.x) * 0.24;
    const nextY = current.y + (target.y - current.y) * 0.24;
    gridCursorCurrentRef.current = { x: nextX, y: nextY };
    stage.style.setProperty('--grid-cursor-x', `${nextX.toFixed(1)}px`);
    stage.style.setProperty('--grid-cursor-y', `${nextY.toFixed(1)}px`);

    const dx = Math.abs(target.x - nextX);
    const dy = Math.abs(target.y - nextY);
    if (dx < 0.25 && dy < 0.25) {
      gridCursorAnimationRef.current = null;
      return;
    }
    gridCursorAnimationRef.current = window.requestAnimationFrame(animateGridCursor);
  };

  const startGridCursorAnimation = () => {
    if (gridCursorAnimationRef.current !== null) return;
    gridCursorAnimationRef.current = window.requestAnimationFrame(animateGridCursor);
  };

  const handleStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    updateGridCursorTarget(event);
    startGridCursorAnimation();
  };

  const handleStagePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = canvasStageRef.current;
    if (!stage) return;
    updateGridCursorTarget(event);
    const { x, y } = gridCursorTargetRef.current;
    gridCursorCurrentRef.current = { x, y };
    stage.style.setProperty('--grid-cursor-x', `${x.toFixed(1)}px`);
    stage.style.setProperty('--grid-cursor-y', `${y.toFixed(1)}px`);
    stage.style.setProperty('--grid-focus-opacity', '0.78');
  };

  const handleStagePointerLeave = () => {
    const stage = canvasStageRef.current;
    if (!stage) return;
    stage.style.setProperty('--grid-focus-opacity', '0');
  };

  const startWorkspacePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!spacePressed || event.button !== 0) return;
    event.preventDefault();
    isPanningRef.current = true;
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: workspacePan.x,
      panY: workspacePan.y
    };
    const move = (moveEvent: PointerEvent) => {
      if (!isPanningRef.current) return;
      setWorkspacePan({
        x: panStartRef.current.panX + moveEvent.clientX - panStartRef.current.x,
        y: panStartRef.current.panY + moveEvent.clientY - panStartRef.current.y
      });
    };
    const up = () => {
      isPanningRef.current = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const switchFrame = (frameId: string) => {
    saveCurrentFrame();
    setActiveFrameId(frameId);
  };

  const addFrame = (preset: FramePreset = presets[1]) => {
    saveCurrentFrame();
    const nextFrame: DesignFrame = {
      ...preset,
      id: createId(),
      name: `${preset.name} ${framesRef.current.length + 1}`,
      backgroundColor: '#ffffff',
      backgroundOpacity: 1,
      backgroundMode: 'solid',
      backgroundStops: createDefaultGradientStops('#ffffff', '#d9d9d9')
    };
    const nextFrames = [...framesRef.current, nextFrame];
    framesRef.current = nextFrames;
    setFrames(nextFrames);
    setActiveFrameId(nextFrame.id);
  };

  const deleteSelectedFrame = () => {
    if (frames.length <= 1) return;
    const nextFrames = frames.filter((frame) => frame.id !== activeFrameId);
    framesRef.current = nextFrames;
    setFrames(nextFrames);
    setActiveFrameId(nextFrames[0].id);
  };

  const addText = () => {
    addTextAt(120, 120);
  };

  const addTextAt = (left: number, top: number) => {
    const settings = styleSettingsRef.current;
    addObject(
      new Textbox('Double click to edit', {
        left,
        top,
        originX: 'left',
        originY: 'top',
        width: 420,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        fill: colorWithOpacity(settings.fillColor, settings.fillOpacity),
        fontWeight: 700
      }) as WebsterObject,
      'Text'
    );
  };

  const createDrawableObject = (tool: ToolMode, left: number, top: number) => {
    const settings = styleSettingsRef.current;
    if (tool === 'box') {
      const rect = new Rect({
        left,
        top,
        originX: 'left',
        originY: 'top',
        width: 1,
        height: 1,
        rx: settings.cornerRadii.topLeft,
        ry: settings.cornerRadii.topLeft,
        fill: colorWithOpacity(settings.fillColor, settings.fillOpacity)
      }) as WebsterObject;
      setCornerRadiiMetadata(rect, settings.cornerRadii);
      rect.objectId = createId();
      rect.objectName = 'Rectangle';
      rect.fillLayers = [createFillLayer('solid', settings.fillColor, settings.fillOpacity)];
      applyFillLayersToObject(rect);
      return rect;
    }
    if (tool === 'circle') {
      const circle = new Circle({ left, top, originX: 'left', originY: 'top', radius: 1, fill: colorWithOpacity(settings.fillColor, settings.fillOpacity) }) as WebsterObject;
      circle.objectId = createId();
      circle.objectName = 'Circle';
      circle.fillLayers = [createFillLayer('solid', settings.fillColor, settings.fillOpacity)];
      applyFillLayersToObject(circle);
      return circle;
    }
    if (tool === 'shape') {
      const triangle = new Triangle({ left, top, originX: 'left', originY: 'top', width: 1, height: 1, fill: colorWithOpacity(settings.fillColor, settings.fillOpacity) }) as WebsterObject;
      triangle.objectId = createId();
      triangle.objectName = 'Triangle';
      triangle.fillLayers = [createFillLayer('solid', settings.fillColor, settings.fillOpacity)];
      applyFillLayersToObject(triangle);
      return triangle;
    }
    return null;
  };

  const addRect = () => {
    const rect = new Rect({
      left: 180,
      top: 180,
      originX: 'left',
      originY: 'top',
      width: 280,
      height: 180,
      rx: cornerRadii.topLeft,
      ry: cornerRadii.topLeft,
      fill: colorWithOpacity(fillColor, fillOpacity)
    }) as WebsterObject;
    setCornerRadiiMetadata(rect, cornerRadii);
    addObject(rect, 'Rectangle');
  };

  const addCircle = () => {
    addObject(new Circle({ left: 220, top: 220, originX: 'left', originY: 'top', radius: 110, fill: colorWithOpacity(fillColor, fillOpacity) }) as WebsterObject, 'Circle');
  };

  const addTriangle = () => {
    addObject(new Triangle({ left: 250, top: 220, originX: 'left', originY: 'top', width: 240, height: 220, fill: colorWithOpacity(fillColor, fillOpacity) }) as WebsterObject, 'Triangle');
  };

  const updateFrameWidth = (value: number) => {
    const width = clampFrameSize(value);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      setCanvasSize(canvas, width, activeFrame.height);
      saveCurrentFrame(true);
    }
    updateActiveFrame({ width });
  };

  const updateFrameHeight = (value: number) => {
    const height = clampFrameSize(value);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      setCanvasSize(canvas, activeFrame.width, height);
      saveCurrentFrame(true);
    }
    updateActiveFrame({ height });
  };

  const updateFrameBackground = (color: string) => {
    const nextFrame = { ...activeFrame, backgroundColor: color };
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      setCanvasBackground(canvas, getFrameBackgroundFill(nextFrame));
      saveCurrentFrame(true);
    }
    updateActiveFrame({ backgroundColor: color });
  };

  const updateFrameBackgroundOpacity = (opacityValue: number) => {
    const nextOpacity = clampOpacity(opacityValue);
    const nextFrame = { ...activeFrame, backgroundOpacity: nextOpacity };
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      setCanvasBackground(canvas, getFrameBackgroundFill(nextFrame));
      saveCurrentFrame(true);
    }
    updateActiveFrame({ backgroundOpacity: nextOpacity });
  };

  const updateFrameBackgroundMode = (mode: FillMode) => {
    const nextFrame = { ...activeFrame, backgroundMode: mode };
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      setCanvasBackground(canvas, getFrameBackgroundFill(nextFrame));
      saveCurrentFrame(true);
    }
    updateActiveFrame({ backgroundMode: mode });
  };

  const updateFrameGradientStop = (id: string, patch: Partial<Pick<GradientStopItem, 'offset' | 'color' | 'opacity'>>) => {
    const nextStops = getFrameStops(activeFrame)
      .map((stop) => stop.id === id ? { ...stop, ...patch } : stop)
      .sort((a, b) => a.offset - b.offset);
    const nextFrame = { ...activeFrame, backgroundStops: nextStops };
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      setCanvasBackground(canvas, getFrameBackgroundFill(nextFrame));
      saveCurrentFrame(true);
    }
    updateActiveFrame({ backgroundStops: nextStops });
  };

  const addFrameGradientStop = () => {
    const nextStops = [...getFrameStops(activeFrame), { id: createId(), offset: 0.5, color: '#737373', opacity: 1 }]
      .sort((a, b) => a.offset - b.offset);
    updateActiveFrame({ backgroundStops: nextStops });
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      setCanvasBackground(canvas, getFrameBackgroundFill({ ...activeFrame, backgroundStops: nextStops }));
      saveCurrentFrame(true);
    }
  };

  const removeFrameGradientStop = (id: string) => {
    const currentStops = getFrameStops(activeFrame);
    if (currentStops.length <= 2) return;
    const nextStops = currentStops.filter((stop) => stop.id !== id);
    updateActiveFrame({ backgroundStops: nextStops });
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      setCanvasBackground(canvas, getFrameBackgroundFill({ ...activeFrame, backgroundStops: nextStops }));
      saveCurrentFrame(true);
    }
  };

  const commitFrameWidth = () => {
    const width = clampFrameSize(Number(frameWidthInput));
    setFrameWidthInput(String(width));
    updateFrameWidth(width);
  };

  const commitFrameHeight = () => {
    const height = clampFrameSize(Number(frameHeightInput));
    setFrameHeightInput(String(height));
    updateFrameHeight(height);
  };

  const addObject = (object: WebsterObject, name: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    object.objectId = createId();
    object.objectName = name;
    object.fillLayers = [createFillLayer('solid', fillColor, fillOpacity)];
    applyFillLayersToObject(object);
    canvas.add(object);
    if ('bringObjectToFront' in canvas) canvas.bringObjectToFront(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    saveCurrentFrame(true);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || typeof reader.result !== 'string') return;
      const image = (await FabricImage.fromURL(reader.result)) as WebsterObject;
      image.scaleToWidth(420);
      image.set({ left: 120, top: 160 });
      addObject(image, 'Image');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const updateFill = (color: string) => {
    setFillColor(color);
    setFillMode('solid');
    updateActiveFillLayer({ color, mode: 'solid' });
  };

  const updateFillOpacity = (value: number) => {
    setFillOpacity(value);
    updateActiveFillLayer({ opacity: value });
  };

  const applyFillMode = (mode: FillMode) => {
    setFillMode(mode);
    updateActiveFillLayer({ mode });
  };

  const updateActiveFillLayer = (patch: Partial<Omit<FillLayer, 'id'>>) => {
    const active = selectedObject;
    if (!active || active.type === 'image') return;
    const currentLayers = getObjectFillLayers(active);
    const targetId = activeFillLayerId || currentLayers[0].id;
    const nextLayers = currentLayers.map((layer) => layer.id === targetId ? { ...layer, ...patch } : layer);
    setFillLayers(nextLayers);
    const nextActiveLayer = nextLayers.find((layer) => layer.id === targetId) ?? nextLayers[0];
    setActiveFillLayerId(nextActiveLayer.id);
    setFillColor(nextActiveLayer.color);
    setFillOpacity(nextActiveLayer.opacity);
    setFillMode(nextActiveLayer.mode);
    setGradientStops(nextActiveLayer.stops);
    active.fillLayers = nextLayers;
    applyFillLayersToObject(active);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const addFillLayer = (mode: FillMode) => {
    const active = selectedObject;
    if (!active || active.type === 'image') return;
    const nextLayer = createFillLayer(mode, mode === 'solid' ? '#000000' : '#2563eb', mode === 'solid' ? 0.2 : 1);
    const nextLayers = [nextLayer, ...getObjectFillLayers(active)];
    active.fillLayers = nextLayers;
    setFillLayers(nextLayers);
    setActiveFillLayerId(nextLayer.id);
    setFillColor(nextLayer.color);
    setFillOpacity(nextLayer.opacity);
    setFillMode(nextLayer.mode);
    setGradientStops(nextLayer.stops);
    applyFillLayersToObject(active);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const selectFillLayer = (layer: FillLayer) => {
    setActiveFillLayerId(layer.id);
    setFillColor(layer.color);
    setFillOpacity(layer.opacity);
    setFillMode(layer.mode);
    setGradientStops(layer.stops);
  };

  const removeFillLayer = (id: string) => {
    const active = selectedObject;
    if (!active || active.type === 'image') return;
    const currentLayers = getObjectFillLayers(active);
    if (currentLayers.length <= 1) return;
    const nextLayers = currentLayers.filter((layer) => layer.id !== id);
    active.fillLayers = nextLayers;
    setFillLayers(nextLayers);
    selectFillLayer(nextLayers[0]);
    applyFillLayersToObject(active);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateOpacity = (value: number) => {
    setOpacity(value);
    selectedObject?.set('opacity', value);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateFontSize = (value: number) => {
    setFontSize(value);
    selectedObject?.set('fontSize', value);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateFontFamily = (value: string) => {
    setFontFamily(value);
    selectedObject?.set('fontFamily', value);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateElementWidth = (value: number) => {
    setElementWidth(value);
    if (!selectedObject) return;
    const currentScaleX = selectedObject.scaleX || 1;
    const baseWidth = selectedObject.getBoundingRect().width / currentScaleX;
    selectedObject.set('scaleX', value / baseWidth);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateElementHeight = (value: number) => {
    setElementHeight(value);
    if (!selectedObject) return;
    const currentScaleY = selectedObject.scaleY || 1;
    const baseHeight = selectedObject.getBoundingRect().height / currentScaleY;
    selectedObject.set('scaleY', value / baseHeight);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateTextAlign = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align);
    selectedObject?.set('textAlign', align);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateCornerRadius = (corner: keyof CornerRadii, value: number) => {
    const next = { ...cornerRadii, [corner]: value };
    setCornerRadii(next);
    applyCornerRadii(next);
  };

  const applyCornerRadii = (radii: CornerRadii) => {
    applyCornerRadiiToActive(radii, true);
  };

  const applyCornerRadiiToActive = (radii: CornerRadii, recordHistory: boolean) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject() as WebsterObject | undefined;
    if (!canvas || !active || !isCornerEditable(active)) return;
    if (active instanceof Rect && hasUniformRadii(radii)) {
      active.set({ rx: radii.topLeft, ry: radii.topLeft });
      setCornerRadiiMetadata(active, radii);
      canvas.requestRenderAll();
      setSelectedObject(active);
      setCornerHandles(getCornerHandles(active));
      setResizeHandles(getResizeHandles(active));
      saveCurrentFrame(recordHistory);
      return;
    }
    const replacement = createRoundedRectPathFromObject(active, radii);
    if (!replacement) return;
    canvas.remove(active);
    canvas.add(replacement);
    canvas.setActiveObject(replacement);
    setSelectedObject(replacement);
    canvas.requestRenderAll();
    setCornerHandles(getCornerHandles(replacement));
    setResizeHandles(getResizeHandles(replacement));
    saveCurrentFrame(recordHistory);
  };

  const startResizeDrag = (event: ReactPointerEvent<HTMLButtonElement>, corner: keyof CornerRadii) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject() as WebsterObject | undefined;
    const frameElement = activeFrameRef.current;
    if (!canvas || !active || !frameElement) return;

    event.preventDefault();
    event.stopPropagation();
    (active as WebsterObject & { setCoords?: () => void }).setCoords?.();
    const rect = frameElement.getBoundingClientRect();
    const scale = rect.width / activeFrame.width;
    const startX = event.clientX;
    const startY = event.clientY;
    const startBox = active.getBoundingRect();
    const startScaleX = active.scaleX || 1;
    const startScaleY = active.scaleY || 1;
    const anchorOrigin = getResizeAnchorOrigin(corner);
    const anchor = active.getPositionByOrigin(anchorOrigin.x, anchorOrigin.y);

    const move = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const pointerX = getResizePointerCoordinate(corner, 'x', startBox, (moveEvent.clientX - startX) / scale);
      const pointerY = getResizePointerCoordinate(corner, 'y', startBox, (moveEvent.clientY - startY) / scale);
      const nextWidth = Math.max(1, Math.abs(pointerX - anchor.x));
      const nextHeight = Math.max(1, Math.abs(pointerY - anchor.y));
      const nextScaleX = (nextWidth / Math.max(1, startBox.width)) * startScaleX;
      const nextScaleY = (nextHeight / Math.max(1, startBox.height)) * startScaleY;
      active.set({
        scaleX: nextScaleX,
        scaleY: nextScaleY
      });
      const nextAnchorOrigin = getDynamicAnchorOrigin(anchor, pointerX, pointerY);
      active.setPositionByOrigin(new Point(anchor.x, anchor.y), nextAnchorOrigin.x, nextAnchorOrigin.y);
      active.setCoords();
      refreshObjectFillOnResize(active);
      setElementWidth(Math.round(active.getBoundingRect().width));
      setElementHeight(Math.round(active.getBoundingRect().height));
      setResizeHandles(getResizeHandles(active));
      setCornerHandles(isCornerEditable(active) ? getCornerHandles(active) : []);
      canvas.requestRenderAll();
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      saveCurrentFrame(true);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startCornerRadiusDrag = (event: ReactPointerEvent<HTMLButtonElement>, corner: keyof CornerRadii) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject() as WebsterObject | undefined;
    const frameElement = activeFrameRef.current;
    if (!canvas || !active || !frameElement || !isCornerEditable(active)) return;

    event.preventDefault();
    event.stopPropagation();
    const rect = frameElement.getBoundingClientRect();
    const scale = rect.width / activeFrame.width;
    const startX = event.clientX;
    const startY = event.clientY;
    const startRadii = getObjectCornerRadii(active);
    const box = active.getBoundingRect();
    const maxRadius = Math.max(0, Math.min(box.width, box.height) / 2);

    const move = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      const delta = getCornerRadiusDelta(corner, dx, dy);
      const baseRadius = startRadii[corner];
      const nextRadius = clampRadius(baseRadius + delta, maxRadius);
      const nextRadii = moveEvent.ctrlKey
        ? { ...startRadii, [corner]: nextRadius }
        : {
            topLeft: nextRadius,
            topRight: nextRadius,
            bottomRight: nextRadius,
            bottomLeft: nextRadius
          };
      setCornerRadii(nextRadii);
      applyCornerRadiiToActive(nextRadii, false);
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      saveCurrentFrame(true);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const addGradientStop = () => {
    setGradientStops((current) => [...current, { id: createId(), offset: 0.5, color: '#2563eb', opacity: 1 }].sort((a, b) => a.offset - b.offset));
  };

  const updateGradientStop = (id: string, patch: Partial<Pick<GradientStopItem, 'offset' | 'color' | 'opacity'>>) => {
    const next = gradientStops.map((stop) => (stop.id === id ? { ...stop, ...patch } : stop)).sort((a, b) => a.offset - b.offset);
    setGradientStops(next);
    if (fillMode === 'gradient') updateActiveFillLayer({ stops: next });
  };

  const removeGradientStop = (id: string) => {
    setGradientStops((current) => current.length <= 2 ? current : current.filter((stop) => stop.id !== id));
  };

  const removeSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    setSelectedObject(null);
    setCornerHandles([]);
    setResizeHandles([]);
    saveCurrentFrame(true);
  };

  const copySelected = async () => {
    const active = fabricCanvasRef.current?.getActiveObject() as WebsterObject | undefined;
    if (!active) return;
    const cloneable = active as WebsterObject & { clone?: (properties?: string[]) => Promise<WebsterObject> };
    const clone = cloneable.clone ? await cloneable.clone(exportProperties) : null;
    if (!clone) return;
    clipboardObjectRef.current = clone;
  };

  const pasteSelected = async () => {
    const canvas = fabricCanvasRef.current;
    const source = clipboardObjectRef.current as (WebsterObject & { clone?: (properties?: string[]) => Promise<WebsterObject> }) | null;
    if (!canvas || !source?.clone) return;
    const clone = await source.clone(exportProperties);
    clone.set({
      left: (clone.left ?? 0) + 24,
      top: (clone.top ?? 0) + 24
    });
    clone.objectId = createId();
    clone.objectName = `${getObjectName(clone)} copy`;
    if (clone.fillLayers?.length) applyFillLayersToObject(clone);
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.requestRenderAll();
    setSelectedObject(clone);
    setLayers(getLayers(canvas, clone));
    saveCurrentFrame(true);
  };

  const selectLayer = (index: number) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getObjects()[index] as WebsterObject | undefined;
    if (!canvas || !object) return;
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    setSelectedObject(object);
    setLayers(getLayers(canvas, object));
  };

  const exportFrame = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${activeFrame.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL({ format: 'png', multiplier: 1 });
    link.click();
  };

  const exportProject = async () => {
    saveCurrentFrame();
    const zip = new JSZip();
    const project = await createPortableProject(framesRef.current, zip);
    zip.file('project.json', JSON.stringify(project, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.download = 'webster-project.zip';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importProject = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (!(reader.result instanceof ArrayBuffer)) return;
      const zip = await JSZip.loadAsync(reader.result);
      const projectFile = zip.file('project.json');
      if (!projectFile) return;
      const project = await hydratePortableProject(JSON.parse(await projectFile.async('string')), zip);
      const nextFrames = (project.frames as DesignFrame[]).map((frame) => ({
        ...frame,
        backgroundColor: frame.backgroundColor ?? '#ffffff',
        backgroundOpacity: frame.backgroundOpacity ?? 1,
        backgroundMode: frame.backgroundMode ?? 'solid',
        backgroundStops: frame.backgroundStops?.length ? frame.backgroundStops : createDefaultGradientStops(frame.backgroundColor ?? '#ffffff', '#d9d9d9')
      }));
      framesRef.current = nextFrames;
      setFrames(nextFrames);
      setActiveFrameId(nextFrames[0]?.id ?? createId());
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const activeName = selectedObject ? getObjectName(selectedObject) : 'nothing selected';
  const isTextSelected = selectedObject instanceof Textbox || selectedObject?.type === 'textbox' || selectedObject?.type === 'text';
  const isShapeSelected = Boolean(selectedObject && selectedObject.type !== 'image' && !isTextSelected);
  const canEditCorners = Boolean(selectedObject && isCornerEditable(selectedObject));
  const activeFillLayer = fillLayers.find((layer) => layer.id === activeFillLayerId) ?? fillLayers[0];
  const isTemplatesMode = workspaceMode === 'templates';

  return (
    <main className={isTemplatesMode ? 'designer-shell templates-mode' : 'designer-shell'}>
      <aside className="sidebar" aria-label="Project tools">
        <div className="brand-block">
          <span className="brand-mark">W</span>
          <div>
            <p className="eyebrow">Webster</p>
            <h1>Design editor</h1>
          </div>
        </div>

        <nav className="sidebar-quick-nav" aria-label="Main tools">
          <button className="quick-nav-item active" type="button"><Grid3X3 size={18} /><span>Templates</span></button>
          <button className="quick-nav-item" type="button"><Upload size={18} /><span>Uploads</span></button>
          <button className="quick-nav-item" type="button"><Shapes size={18} /><span>Elements</span></button>
          <button className="quick-nav-item" type="button"><Type size={18} /><span>Text</span></button>
          <button className="quick-nav-item" type="button"><ImagePlus size={18} /><span>Photos</span></button>
          <button className="quick-nav-item" type="button"><Sparkles size={18} /><span>Styles</span></button>
          <button className="quick-nav-item" type="button"><GraduationCap size={18} /><span>Learn</span></button>
        </nav>

        {!isTemplatesMode ? (
          <>
            <section className="tool-section">
              <div className="section-heading">
                <h2>Frames</h2>
                <button onClick={() => addFrame()} title="Add frame" type="button">
                  <Plus size={16} />
                </button>
              </div>
              <div className="template-list">
                {frames.map((frame, index) => (
                  <button className={`template-card ${getTemplateToneClass(index)}${frame.id === activeFrameId ? ' active' : ''}`} key={frame.id} onClick={() => switchFrame(frame.id)} type="button">
                    <div className="template-card-copy">
                      <strong>{frame.name}</strong>
                      <span>{frame.description}</span>
                      <small>{frame.width} x {frame.height}</small>
                    </div>
                    <div aria-hidden className={`template-thumb ${getTemplatePreviewClass(frame, index)}`}>
                      <i className="template-thumb-canvas" />
                      <i className="template-thumb-shape template-thumb-shape-main" />
                      <i className="template-thumb-shape template-thumb-shape-accent" />
                      <i className="template-thumb-badge" />
                    </div>
                  </button>
                ))}
              </div>
              <div className="preset-row">
                {presets.map((preset) => (
                  <button key={preset.name} onClick={() => addFrame(preset)} type="button">
                    {preset.name}
                  </button>
                ))}
              </div>
              <button className="wide-action muted-action" disabled={frames.length <= 1} onClick={deleteSelectedFrame} title="Delete current frame" type="button">
                Delete frame
              </button>
            </section>

            <section className="tool-section">
              <h2>Objects</h2>
              <div className="icon-grid">
                <button onClick={addText} type="button"><Type size={20} /><span>Text</span></button>
                <button onClick={addRect} type="button"><Square size={20} /><span>Box</span></button>
                <button onClick={addCircle} type="button"><CircleIcon size={20} /><span>Circle</span></button>
                <button onClick={addTriangle} type="button"><TriangleIcon size={20} /><span>Shape</span></button>
              </div>
              <button className="wide-action" onClick={() => fileInputRef.current?.click()} title="Upload an image into the current frame" type="button">
                <ImagePlus size={18} /> Add image
              </button>
              <input accept="image/*" hidden onChange={handleImageUpload} ref={fileInputRef} type="file" />
            </section>

            <section className="tool-section">
              <h2>Layers</h2>
              <div className="layer-tree">
                {layers.map((layer) => (
                  <button className={layer.active ? 'layer-tree-row active' : 'layer-tree-row'} key={layer.id} onClick={() => selectLayer(layer.index)} type="button">
                    <strong>{layer.name}</strong>
                    <span>{layer.type}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="tool-section">
              <h2>Project</h2>
              <div className="preset-row">
                <button onClick={undoFrame} title="Ctrl+Z" type="button">Undo</button>
                <button onClick={redoFrame} title="Ctrl+Y" type="button">Redo</button>
              </div>
              <button className="wide-action" onClick={exportProject} title="Export project as ZIP with JSON and image assets" type="button"><Download size={18} /> Export project</button>
              <button className="wide-action" onClick={() => importInputRef.current?.click()} title="Import Webster project ZIP" type="button"><Upload size={18} /> Import project</button>
              <input accept=".zip,application/zip" hidden onChange={importProject} ref={importInputRef} type="file" />
            </section>
          </>
        ) : null}

        <div aria-hidden className="sidebar-mascot" title="Webster owl mascot">
          <img alt="" className="sidebar-mascot-image" src={owlMascot} />
        </div>
      </aside>

      <section className="workspace" aria-label="Design workspace">
        <header className="topbar">
          <div className="topbar-brand">
            <span className="topbar-brand-mark">W</span>
            <div>
              <strong className="topbar-brand-title">{isTemplatesMode ? 'Creative Craft' : activeFrame.name}</strong>
              <p className="eyebrow topbar-brand-subtitle">{isTemplatesMode ? 'Design made simple. Creations made brilliant.' : `${activeFrame.width} x ${activeFrame.height} · Design made simple`}</p>
            </div>
          </div>
          <nav aria-label="Workspace sections" className="topbar-nav">
            <button aria-current={!isTemplatesMode ? 'page' : undefined} className={!isTemplatesMode ? 'topbar-nav-item active' : 'topbar-nav-item'} onClick={() => setWorkspaceMode('editor')} type="button">Home</button>
            <button aria-current={isTemplatesMode ? 'page' : undefined} className={isTemplatesMode ? 'topbar-nav-item active' : 'topbar-nav-item'} onClick={() => setWorkspaceMode('templates')} type="button">Templates</button>
            <button className="topbar-nav-item" type="button">Resources</button>
            <button className="topbar-nav-item" type="button">Support</button>
          </nav>
          <div className="topbar-actions">
            {isTemplatesMode ? (
              <button className="primary-button topbar-action-pill topbar-action-primary" onClick={() => setWorkspaceMode('editor')} title="Open editor" type="button">CREATE DESIGN <span aria-hidden className="topbar-plus-badge">+</span></button>
            ) : (
              <>
                <div className="topbar-pill-group" aria-label="Workspace zoom">
                  <button className="topbar-pill-button" onClick={() => setZoom(workspaceZoom - 0.1)} title="Zoom out" type="button">-</button>
                  <button className="topbar-pill-button topbar-pill-value" onClick={() => { setWorkspacePan({ x: 0, y: 0 }); setZoom(0.62); }} title="Reset zoom and pan" type="button">{zoomPercent}%</button>
                  <button className="topbar-pill-button" onClick={() => setZoom(workspaceZoom + 0.1)} title="Zoom in" type="button">+</button>
                </div>
                <button className={showGrid ? 'topbar-action-pill active' : 'topbar-action-pill'} onClick={() => setShowGrid((value) => !value)} title="Toggle grid" type="button">
                  <Grid3X3 size={16} /> Grid
                </button>
                <button className="primary-button topbar-action-pill topbar-action-primary" onClick={exportFrame} title="Export current frame as PNG" type="button"><Download size={16} /> Export PNG</button>
              </>
            )}
          </div>
        </header>
        {isTemplatesMode ? (
          <section className="templates-gallery" aria-label="Template gallery">
            <div aria-hidden className="templates-decor">
              <i className="decor-star decor-star-a" />
              <i className="decor-star decor-star-b" />
              <i className="decor-dot decor-dot-a" />
              <i className="decor-dot decor-dot-b" />
              <i className="decor-arc decor-arc-a" />
              <i className="decor-arc decor-arc-b" />
              <i className="decor-spark decor-spark-a" />
            </div>
            <div className="templates-gallery-head">
              <h2>Templates</h2>
              <span>Pick a format and start designing in one click.</span>
            </div>
            <div className="templates-gallery-grid">
              {galleryTemplates.map((item) => (
                <button className={`templates-gallery-card ${item.toneClass}`} key={item.id} onClick={() => setWorkspaceMode('editor')} type="button">
                  <div className="templates-gallery-copy">
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                    <small>{item.size}</small>
                    <span className="templates-gallery-cta">Use template</span>
                  </div>
                  <div aria-hidden className={`templates-gallery-illustration ${item.illustrationClass}`}>
                    <i className="illustration-frame" />
                    <i className="illustration-accent" />
                    <i className="illustration-badge" />
                    <i className="illustration-line" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div
            className={`${showGrid ? 'canvas-stage grid-visible' : 'canvas-stage'} ${spacePressed ? 'pan-mode' : ''}`}
            onPointerDown={startWorkspacePan}
            onPointerEnter={handleStagePointerEnter}
            onPointerLeave={handleStagePointerLeave}
            onPointerMove={handleStagePointerMove}
            onWheel={handleWorkspaceWheel}
            ref={canvasStageRef}
          >
            {showGrid ? (
              <>
                <div aria-hidden className="dot-grid dot-grid-base" />
                <div aria-hidden className="dot-grid dot-grid-focus dot-grid-focus-lg" />
                <div aria-hidden className="dot-grid dot-grid-focus dot-grid-focus-md" />
                <div aria-hidden className="dot-grid dot-grid-focus dot-grid-focus-sm" />
              </>
            ) : null}
            <div className="active-canvas-frame" ref={activeFrameRef} style={{ transform: `translate(${workspacePan.x}px, ${workspacePan.y}px) scale(${workspaceZoom})` }}>
              <canvas ref={canvasElementRef} />
              {snapLines.map((line, index) => (
                <div
                  key={index}
                  className={`snap-line snap-line-${line.direction}`}
                  style={{
                    [line.direction === 'horizontal' ? 'top' : 'left']: `${line.position}px`
                  }}
                />
              ))}
              {resizeHandles.map((handle) => (
                <button
                  aria-label={`Resize from ${handle.key} corner`}
                  className="corner-resize-handle"
                  key={handle.key}
                  onPointerDown={(event) => startResizeDrag(event, handle.key)}
                  style={{ left: handle.left, top: handle.top, cursor: handle.cursor }}
                  title="Drag to resize"
                  type="button"
                />
              ))}
              {cornerHandles.map((handle) => (
                <button
                  aria-label={`Drag ${handle.key} radius handle. Hold Ctrl to edit only this corner.`}
                  className="corner-radius-handle"
                  key={handle.key}
                  onPointerDown={(event) => startCornerRadiusDrag(event, handle.key)}
                  style={{ left: handle.left, top: handle.top, cursor: handle.cursor }}
                  title="Drag: all corners. Ctrl+drag: only this corner."
                  type="button"
                />
              ))}
            </div>
            <div className="floating-toolbar" aria-label="Object tools">
              <button className={activeTool === 'select' ? 'active' : ''} onClick={() => setActiveTool('select')} title="Select (V)" type="button"><MousePointer2 size={20} /><span>V</span></button>
              <button className={activeTool === 'text' ? 'active' : ''} onClick={() => setActiveTool('text')} title="Text (T)" type="button"><Type size={22} /><span>T</span></button>
              <button className={activeTool === 'box' ? 'active' : ''} onClick={() => setActiveTool('box')} title="Box (B)" type="button"><Square size={20} /><span>B</span></button>
              <button className={activeTool === 'circle' ? 'active' : ''} onClick={() => setActiveTool('circle')} title="Circle (C)" type="button"><CircleIcon size={20} /><span>C</span></button>
              <button className={activeTool === 'shape' ? 'active' : ''} onClick={() => setActiveTool('shape')} title="Shape (P)" type="button"><TriangleIcon size={20} /><span>P</span></button>
              <button onClick={() => fileInputRef.current?.click()} title="Image (I)" type="button"><ImagePlus size={20} /><span>I</span></button>
              <div className="toolbar-help">
                <button aria-label="Show shortcuts" title="Shortcuts" type="button">?</button>
                <div className="shortcut-popover" role="tooltip">
                  <span><kbd>Ctrl</kbd><kbd>Z</kbd> Undo</span>
                  <span><kbd>Ctrl</kbd><kbd>Y</kbd> Redo</span>
                  <span><kbd>Ctrl</kbd><kbd>C</kbd> Copy</span>
                  <span><kbd>Ctrl</kbd><kbd>V</kbd> Paste</span>
                  <span><kbd>V</kbd> Select</span>
                  <span><kbd>T</kbd> Text</span>
                  <span><kbd>B</kbd> Box</span>
                  <span><kbd>R</kbd> Box</span>
                  <span><kbd>C</kbd> Circle</span>
                  <span><kbd>P</kbd> Shape</span>
                  <span><kbd>I</kbd> Image</span>
                  <span><kbd>Wheel</kbd> Zoom workspace</span>
                  <span><kbd>Space</kbd><kbd>Drag</kbd> Pan workspace</span>
                  <span><kbd>Del</kbd> Delete selection</span>
                  <span><kbd>Square corner</kbd> Resize</span>
                  <span><kbd>Round corner</kbd> All radii</span>
                  <span><kbd>Ctrl</kbd><kbd>Round corner</kbd> One radius</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="properties" aria-label="Object properties">
        <section className="tool-section">
          <h2>Frame</h2>
          <div className="size-row">
            <label className="field compact-field">
              <span>Width</span>
              <input
                min="100"
                onBlur={commitFrameWidth}
                onChange={(event) => setFrameWidthInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitFrameWidth();
                }}
                type="number"
                value={frameWidthInput}
              />
            </label>
            <label className="field compact-field">
              <span>Height</span>
              <input
                min="100"
                onBlur={commitFrameHeight}
                onChange={(event) => setFrameHeightInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitFrameHeight();
                }}
                type="number"
                value={frameHeightInput}
              />
            </label>
          </div>
          <h2>Fill</h2>
          <div className="segmented-control">
            <button className={(activeFrame.backgroundMode ?? 'solid') === 'solid' ? 'active' : ''} onClick={() => updateFrameBackgroundMode('solid')} type="button">Solid</button>
            <button className={activeFrame.backgroundMode === 'gradient' ? 'active' : ''} onClick={() => updateFrameBackgroundMode('gradient')} type="button">Gradient</button>
          </div>
          {(activeFrame.backgroundMode ?? 'solid') === 'solid' ? (
            <div className="paint-row">
              <input onChange={(event) => updateFrameBackground(event.target.value)} type="color" value={activeFrame.backgroundColor ?? '#ffffff'} />
              <input aria-label="Frame fill opacity" max="100" min="0" onChange={(event) => updateFrameBackgroundOpacity(Number(event.target.value) / 100)} type="number" value={Math.round((activeFrame.backgroundOpacity ?? 1) * 100)} />
              <span>%</span>
            </div>
          ) : (
            <div className="gradient-stop-list">
              {getFrameStops(activeFrame).map((stop) => (
                <div className="gradient-stop-row" key={stop.id}>
                  <input aria-label="Frame stop offset" max="100" min="0" onChange={(event) => updateFrameGradientStop(stop.id, { offset: Number(event.target.value) / 100 })} type="number" value={Math.round(stop.offset * 100)} />
                  <input onChange={(event) => updateFrameGradientStop(stop.id, { color: event.target.value })} type="color" value={stop.color} />
                  <input aria-label="Frame stop opacity" max="100" min="0" onChange={(event) => updateFrameGradientStop(stop.id, { opacity: Number(event.target.value) / 100 })} type="number" value={Math.round(stop.opacity * 100)} />
                  <span>%</span>
                  <button disabled={getFrameStops(activeFrame).length <= 2} onClick={() => removeFrameGradientStop(stop.id)} type="button">-</button>
                </div>
              ))}
              <button className="wide-action" onClick={addFrameGradientStop} type="button">Add stop</button>
            </div>
          )}
        </section>
        <section className="tool-section">
          <h2>Selection</h2>
          <div className="selection-card">
            <span>{activeName}</span>
            <button disabled={!selectedObject} onClick={removeSelected} title="Delete selected object (Del)" type="button"><Trash2 size={18} /></button>
          </div>
        </section>
        <section className="tool-section">
          <h2>Appearance</h2>
          <label className="field">
            <span>Opacity</span>
            <input max="1" min="0" onChange={(event) => updateOpacity(Number(event.target.value))} step="0.05" type="range" value={opacity} />
          </label>
          <div className="size-row">
            <label className="field compact-field">
              <span>Width</span>
              <input min="1" onChange={(event) => updateElementWidth(Number(event.target.value))} type="number" value={elementWidth} />
            </label>
            <label className="field compact-field">
              <span>Height</span>
              <input min="1" onChange={(event) => updateElementHeight(Number(event.target.value))} type="number" value={elementHeight} />
            </label>
          </div>
        </section>
        <section className="tool-section">
          <h2>Fill</h2>
          <div className="fill-layer-list">
            {fillLayers.map((layer, index) => (
              <button className={layer.id === activeFillLayer?.id ? 'fill-layer-row active' : 'fill-layer-row'} key={layer.id} onClick={() => selectFillLayer(layer)} type="button">
                <span>{index === 0 ? 'Top' : `Layer ${index + 1}`}</span>
                <strong>{layer.mode}</strong>
                <small>{Math.round(layer.opacity * 100)}%</small>
                <i style={{ background: layer.mode === 'solid' ? colorWithOpacity(layer.color, layer.opacity) : createGradientPreview(layer.stops) }} />
              </button>
            ))}
          </div>
          <div className="preset-row">
            <button disabled={!selectedObject || selectedObject.type === 'image'} onClick={() => addFillLayer('solid')} type="button">+ Solid</button>
            <button disabled={!selectedObject || selectedObject.type === 'image'} onClick={() => addFillLayer('gradient')} type="button">+ Gradient</button>
            <button disabled={!activeFillLayer || fillLayers.length <= 1} onClick={() => removeFillLayer(activeFillLayer.id)} type="button">Remove</button>
          </div>
          <div className="segmented-control">
            <button className={fillMode === 'solid' ? 'active' : ''} disabled={!selectedObject || selectedObject.type === 'image'} onClick={() => applyFillMode('solid')} type="button">Solid</button>
            <button className={fillMode === 'gradient' ? 'active' : ''} disabled={!selectedObject || selectedObject.type === 'image'} onClick={() => applyFillMode('gradient')} type="button">Gradient</button>
          </div>
          {fillMode === 'solid' ? (
            <>
              <div className="paint-row">
                <input onChange={(event) => updateFill(event.target.value)} type="color" value={fillColor} />
                <input aria-label="Fill opacity" max="100" min="0" onChange={(event) => updateFillOpacity(Number(event.target.value) / 100)} type="number" value={Math.round(fillOpacity * 100)} />
                <span>%</span>
              </div>
            </>
          ) : (
            <div className="gradient-stop-list">
              {gradientStops.map((stop) => (
                <div className="gradient-stop-row" key={stop.id}>
                  <input aria-label="Stop offset" max="100" min="0" onChange={(event) => updateGradientStop(stop.id, { offset: Number(event.target.value) / 100 })} type="number" value={Math.round(stop.offset * 100)} />
                  <input onChange={(event) => updateGradientStop(stop.id, { color: event.target.value })} type="color" value={stop.color} />
                  <input aria-label="Stop opacity" max="100" min="0" onChange={(event) => updateGradientStop(stop.id, { opacity: Number(event.target.value) / 100 })} type="number" value={Math.round(stop.opacity * 100)} />
                  <span>%</span>
                  <button disabled={gradientStops.length <= 2} onClick={() => removeGradientStop(stop.id)} type="button">-</button>
                </div>
              ))}
              <button className="wide-action" onClick={addGradientStop} type="button">Add stop</button>
            </div>
          )}
        </section>
        {canEditCorners ? (
          <section className="tool-section">
            <h2>Corner radius</h2>
            <div className="corner-grid">
              {cornerFields.map((field) => (
                <label className="field compact-field" key={field.key}>
                  <span>{field.label}</span>
                  <input min="0" onChange={(event) => updateCornerRadius(field.key, Number(event.target.value))} type="number" value={cornerRadii[field.key]} />
                </label>
              ))}
            </div>
          </section>
        ) : null}
        {isTextSelected ? (
          <section className="tool-section">
            <h2>Typography</h2>
            <label className="field">
              <span>Font</span>
              <select onChange={(event) => updateFontFamily(event.target.value)} value={fontFamily}>
                {fontOptions.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Font size</span>
              <input max="120" min="16" onChange={(event) => updateFontSize(Number(event.target.value))} type="range" value={fontSize} />
              <strong>{fontSize}px</strong>
            </label>
            <label className="field">
              <span>Align</span>
              <div className="align-buttons">
                <button className={textAlign === 'left' ? 'active' : ''} onClick={() => updateTextAlign('left')} type="button">Left</button>
                <button className={textAlign === 'center' ? 'active' : ''} onClick={() => updateTextAlign('center')} type="button">Center</button>
                <button className={textAlign === 'right' ? 'active' : ''} onClick={() => updateTextAlign('right')} type="button">Right</button>
              </div>
            </label>
          </section>
        ) : null}
      </aside>
    </main>
  );
}

function addStarterObjects(canvas: Canvas, frame: DesignFrame) {
  const heading = new Textbox('Create visuals without\ndesign skills', {
    left: frame.width * 0.13,
    top: frame.height * 0.09,
    width: frame.width * 0.48,
    fontFamily: 'Inter, Segoe UI, sans-serif',
    fontSize: Math.max(42, frame.width * 0.05),
    fontWeight: 800,
    fill: '#111827'
  }) as WebsterObject;
  const accent = new Rect({
    left: frame.width * 0.08,
    top: frame.height * 0.36,
    width: frame.width * 0.42,
    height: Math.max(18, frame.height * 0.028),
    rx: 10,
    ry: 10,
    fill: '#2563eb'
  }) as WebsterObject;
  const circle = new Circle({
    left: frame.width * 0.65,
    top: frame.height * 0.27,
    radius: Math.max(58, frame.width * 0.075),
    fill: '#2563eb'
  }) as WebsterObject;
  const caption = new Textbox('Drag, resize, recolor, upload images and export\nthe final layout.', {
    left: frame.width * 0.08,
    top: frame.height * 0.48,
    width: frame.width * 0.45,
    fontFamily: 'Inter, Segoe UI, sans-serif',
    fontSize: Math.max(22, frame.width * 0.024),
    fill: '#4b5563'
  }) as WebsterObject;
  const triangle = new Triangle({
    left: frame.width * 0.42,
    top: frame.height * 0.58,
    width: frame.width * 0.18,
    height: frame.height * 0.26,
    fill: '#111827'
  }) as WebsterObject;
  [heading, accent, circle, caption, triangle].forEach((object, index) => {
    object.objectId = createId();
    object.objectName = ['Headline', 'Accent bar', 'Blue circle', 'Caption', 'Triangle'][index];
    ensureFillLayerMetadata(object);
    refreshObjectFillOnResize(object);
  });
  canvas.add(heading, accent, circle, caption, triangle);
}

function getLayers(canvas: Canvas, active: WebsterObject | null): LayerItem[] {
  return canvas.getObjects().map((object, index) => {
    const item = object as WebsterObject;
    item.objectId ??= createId();
    item.objectName ??= item.type ?? 'Object';
    return {
      index,
      id: item.objectId,
      name: getObjectName(item),
      type: item.type ?? 'object',
      active: item === active
    };
  }).reverse();
}

function ensureObjectIds(canvas: Canvas) {
  (canvas.getObjects() as WebsterObject[]).forEach((object) => {
    object.objectId ??= createId();
    object.objectName ??= object.type ?? 'Object';
    configureSelectionOutline(object);
    ensureFillLayerMetadata(object);
    if (object.fillLayers?.length) applyFillLayersToObject(object);
  });
}

function configureSelectionOutline(object?: WebsterObject) {
  if (!object) return;
  object.set({
    hasControls: false,
    hasBorders: true,
    borderColor: '#7ca7ff',
    borderScaleFactor: 1
  });
  object.setControlsVisibility?.({
    mt: false,
    mb: false,
    ml: false,
    mr: false,
    tl: false,
    tr: false,
    bl: false,
    br: false,
    mtr: false
  });
}

function getCanvasPointer(canvas: Canvas, event: MouseEvent) {
  const pointerCanvas = canvas as Canvas & {
    getScenePoint?: (event: MouseEvent) => { x: number; y: number };
    getPointer?: (event: MouseEvent) => { x: number; y: number };
  };
  return pointerCanvas.getScenePoint?.(event) ?? pointerCanvas.getPointer?.(event) ?? null;
}

function resizeDrawableObject(object: WebsterObject, start: { x: number; y: number }, end: { x: number; y: number }) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.max(1, Math.abs(end.x - start.x));
  const height = Math.max(1, Math.abs(end.y - start.y));

  if (object instanceof Circle) {
    const radius = Math.max(1, Math.min(width, height) / 2);
    object.set({ left, top, radius });
  } else {
    object.set({ left, top, width, height });
  }
  (object as WebsterObject & { setCoords?: () => void }).setCoords?.();
  refreshObjectFillOnResize(object);
}

function normalizeDrawableObject(object: WebsterObject) {
  (object as WebsterObject & { setCoords?: () => void }).setCoords?.();
  const box = object.getBoundingRect();
  if (box.width < 6 && box.height < 6) {
    if (object instanceof Circle) {
      object.set({ radius: 55 });
    } else {
      object.set({ width: 180, height: 120 });
    }
  }
  (object as WebsterObject & { setCoords?: () => void }).setCoords?.();
  refreshObjectFillOnResize(object);
}

function setCanvasSize(canvas: Canvas, width: number, height: number) {
  const resizableCanvas = canvas as Canvas & {
    setDimensions?: (dimensions: { width: number; height: number }) => void;
    setWidth?: (width: number) => void;
    setHeight?: (height: number) => void;
  };
  if (resizableCanvas.setDimensions) {
    resizableCanvas.setDimensions({ width, height });
  } else {
    resizableCanvas.setWidth?.(width);
    resizableCanvas.setHeight?.(height);
  }
  canvas.requestRenderAll();
}

function setCanvasBackground(canvas: Canvas, color: string | Pattern) {
  (canvas as Canvas & { backgroundColor: string | Pattern }).backgroundColor = color;
  canvas.requestRenderAll();
}

function getFrameBackgroundFill(frame: DesignFrame) {
  const mode = frame.backgroundMode ?? 'solid';
  if (mode === 'gradient') return createFrameGradientPattern(frame);
  return colorWithOpacity(frame.backgroundColor ?? '#ffffff', frame.backgroundOpacity ?? 1);
}

function createFrameGradientPattern(frame: DesignFrame) {
  const source = document.createElement('canvas');
  source.width = Math.max(2, frame.width);
  source.height = Math.max(2, frame.height);
  const context = source.getContext('2d');
  if (!context) return colorWithOpacity(frame.backgroundColor ?? '#ffffff', frame.backgroundOpacity ?? 1);
  context.fillStyle = createCanvasGradient(context, source.width, source.height, getFrameStops(frame));
  context.fillRect(0, 0, source.width, source.height);
  return new Pattern({ source, repeat: 'no-repeat' });
}

function getFrameStops(frame: DesignFrame) {
  return frame.backgroundStops?.length ? frame.backgroundStops : createDefaultGradientStops(frame.backgroundColor ?? '#ffffff', '#d9d9d9');
}

function createDefaultGradientStops(from: string, to: string) {
  return [
    { id: createId(), offset: 0, color: from, opacity: 1 },
    { id: createId(), offset: 1, color: to, opacity: 1 }
  ];
}

function createFillLayer(mode: FillMode, color: string, opacity: number): FillLayer {
  return {
    id: createId(),
    mode,
    color,
    opacity,
    stops: [
      { id: createId(), offset: 0, color, opacity },
      { id: createId(), offset: 1, color: '#ffffff', opacity: mode === 'gradient' ? 1 : opacity }
    ]
  };
}

function getObjectFillLayers(object: WebsterObject): FillLayer[] {
  if (object.fillLayers?.length) return object.fillLayers;
  const fill = object.get('fill');
  if (typeof fill === 'string') {
    const parsed = parseColor(fill);
    return [createFillLayer('solid', parsed?.hex ?? '#1f2937', parsed?.alpha ?? 1)];
  }
  return [createFillLayer('solid', '#1f2937', 1)];
}

function applyFillLayersToObject(object: WebsterObject) {
  const layers = getObjectFillLayers(object);
  object.fillLayers = layers;
  object.set('fill', createCompositeFill(layers, object));
  object.set('dirty', true);
}

function refreshObjectFillOnResize(object: WebsterObject) {
  if (!object.fillLayers?.length) return;
  applyFillLayersToObject(object);
}

function ensureFillLayerMetadata(object: WebsterObject) {
  if (object.fillLayers?.length || object.type === 'image') return;
  const fill = object.get('fill');
  if (typeof fill !== 'string') return;
  const parsed = parseColor(fill);
  object.fillLayers = [createFillLayer('solid', parsed?.hex ?? fill, parsed?.alpha ?? 1)];
}

function createCompositeFill(layers: FillLayer[], object: WebsterObject) {
  if (isJsdomRuntime()) {
    const firstLayer = layers[0];
    return firstLayer.mode === 'solid'
      ? colorWithOpacity(firstLayer.color, firstLayer.opacity)
      : colorWithOpacity(firstLayer.stops[0]?.color ?? firstLayer.color, firstLayer.stops[0]?.opacity ?? firstLayer.opacity);
  }
  const box = object.getBoundingRect();
  const width = Math.max(2, Math.round(Number(object.get('width')) || box.width || 100));
  const height = Math.max(2, Math.round(Number(object.get('height')) || box.height || 100));
  const source = document.createElement('canvas');
  source.width = width;
  source.height = height;
  const context = source.getContext('2d');
  if (!context) return colorWithOpacity(layers[0].color, layers[0].opacity);

  [...layers].reverse().forEach((layer) => {
    context.fillStyle = layer.mode === 'solid'
      ? colorWithOpacity(layer.color, layer.opacity)
      : createCanvasGradient(context, width, height, layer.stops);
    context.fillRect(0, 0, width, height);
  });

  return new Pattern({ source, repeat: 'no-repeat' });
}

function isJsdomRuntime() {
  return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom');
}

function createCanvasGradient(context: CanvasRenderingContext2D, width: number, height: number, stops: GradientStopItem[]) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  stops
    .map((stop) => ({ ...stop, offset: Math.min(1, Math.max(0, stop.offset)) }))
    .sort((a, b) => a.offset - b.offset)
    .forEach((stop) => {
      gradient.addColorStop(stop.offset, colorWithOpacity(stop.color, stop.opacity));
    });
  return gradient;
}

function createGradientPreview(stops: GradientStopItem[]) {
  return `linear-gradient(90deg, ${stops
    .map((stop) => `${colorWithOpacity(stop.color, stop.opacity)} ${Math.round(stop.offset * 100)}%`)
    .join(', ')})`;
}

function clampFrameSize(value: number) {
  return Math.max(100, Math.min(4000, Math.round(Number.isFinite(value) ? value : 100)));
}

function getCornerHandles(object: WebsterObject): CornerHandle[] {
  const box = object.getBoundingRect();
  const inset = Math.max(10, Math.min(24, box.width / 3, box.height / 3));
  return [
    { key: 'topLeft', left: box.left + inset, top: box.top + inset, cursor: 'grab' },
    { key: 'topRight', left: box.left + box.width - inset, top: box.top + inset, cursor: 'grab' },
    { key: 'bottomRight', left: box.left + box.width - inset, top: box.top + box.height - inset, cursor: 'grab' },
    { key: 'bottomLeft', left: box.left + inset, top: box.top + box.height - inset, cursor: 'grab' }
  ];
}

function getResizeHandles(object: WebsterObject): ResizeHandle[] {
  const box = object.getBoundingRect();
  return [
    { key: 'topLeft', left: box.left, top: box.top, cursor: 'nwse-resize' },
    { key: 'topRight', left: box.left + box.width, top: box.top, cursor: 'nesw-resize' },
    { key: 'bottomRight', left: box.left + box.width, top: box.top + box.height, cursor: 'nwse-resize' },
    { key: 'bottomLeft', left: box.left, top: box.top + box.height, cursor: 'nesw-resize' }
  ];
}

function getResizeAnchorOrigin(corner: keyof CornerRadii): { x: 'left' | 'right'; y: 'top' | 'bottom' } {
  switch (corner) {
    case 'topLeft':
      return { x: 'right', y: 'bottom' };
    case 'topRight':
      return { x: 'left', y: 'bottom' };
    case 'bottomRight':
      return { x: 'left', y: 'top' };
    case 'bottomLeft':
      return { x: 'right', y: 'top' };
    default:
      return { x: 'left', y: 'top' };
  }
}

function getDynamicAnchorOrigin(anchor: { x: number; y: number }, pointerX: number, pointerY: number): { x: 'left' | 'right'; y: 'top' | 'bottom' } {
  return {
    x: pointerX >= anchor.x ? 'left' : 'right',
    y: pointerY >= anchor.y ? 'top' : 'bottom'
  };
}

function getResizePointerCoordinate(
  corner: keyof CornerRadii,
  axis: 'x' | 'y',
  box: { left: number; top: number; width: number; height: number },
  delta: number
) {
  const right = box.left + box.width;
  const bottom = box.top + box.height;
  if (axis === 'x') {
    return corner === 'topLeft' || corner === 'bottomLeft' ? box.left + delta : right + delta;
  }
  return corner === 'topLeft' || corner === 'topRight' ? box.top + delta : bottom + delta;
}

function getCornerRadiusDelta(corner: keyof CornerRadii, dx: number, dy: number) {
  switch (corner) {
    case 'topLeft':
      return (dx + dy) / 2;
    case 'topRight':
      return (-dx + dy) / 2;
    case 'bottomRight':
      return (-dx - dy) / 2;
    case 'bottomLeft':
      return (dx - dy) / 2;
    default:
      return 0;
  }
}

function clampRadius(value: number, maxRadius: number) {
  return Math.round(Math.max(0, Math.min(maxRadius, value)));
}

function clampOpacity(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
}

function clampZoom(value: number) {
  return Math.min(2, Math.max(0.2, Number(value.toFixed(2))));
}

function snapMovingObject(canvas: Canvas, movingObject?: WebsterObject, onSnapLinesChange?: (lines: SnapLine[]) => void) {
  if (!movingObject) return;
  const movingBox = movingObject.getBoundingRect();
  const movingPoints = {
    left: movingBox.left,
    centerX: movingBox.left + movingBox.width / 2,
    right: movingBox.left + movingBox.width,
    top: movingBox.top,
    centerY: movingBox.top + movingBox.height / 2,
    bottom: movingBox.top + movingBox.height
  };
  let snapX: number | null = null;
  let snapY: number | null = null;
  let snapXTarget: number | null = null;
  let snapYTarget: number | null = null;
  const newSnapLines: SnapLine[] = [];

  for (const candidate of canvas.getObjects() as WebsterObject[]) {
    if (candidate === movingObject) continue;
    const box = candidate.getBoundingRect();
    const targetPoints = {
      left: box.left,
      centerX: box.left + box.width / 2,
      right: box.left + box.width,
      top: box.top,
      centerY: box.top + box.height / 2,
      bottom: box.top + box.height
    };
    const xSnap = closestSnap(
      [movingPoints.left, movingPoints.centerX, movingPoints.right],
      [targetPoints.left, targetPoints.centerX, targetPoints.right]
    );
    const ySnap = closestSnap(
      [movingPoints.top, movingPoints.centerY, movingPoints.bottom],
      [targetPoints.top, targetPoints.centerY, targetPoints.bottom]
    );

    if (xSnap && (snapX === null || Math.abs(xSnap.delta) < Math.abs(snapX))) {
      snapX = xSnap.delta;
      snapXTarget = xSnap.target;
    }
    if (ySnap && (snapY === null || Math.abs(ySnap.delta) < Math.abs(snapY))) {
      snapY = ySnap.delta;
      snapYTarget = ySnap.target;
    }
  }

  if (snapX !== null && typeof movingObject.left === 'number') {
    movingObject.set('left', movingObject.left + snapX);
    if (snapXTarget !== null) {
      newSnapLines.push({
        direction: 'vertical',
        position: snapXTarget,
        targetPosition: snapXTarget,
        targetObjectId: movingObject.objectId
      });
    }
  }
  if (snapY !== null && typeof movingObject.top === 'number') {
    movingObject.set('top', movingObject.top + snapY);
    if (snapYTarget !== null) {
      newSnapLines.push({
        direction: 'horizontal',
        position: snapYTarget,
        targetPosition: snapYTarget,
        targetObjectId: movingObject.objectId
      });
    }
  }
  
  (movingObject as WebsterObject & { setCoords?: () => void }).setCoords?.();
  
  if (onSnapLinesChange) {
    onSnapLinesChange(newSnapLines);
  }
}

function closestSnap(sourcePoints: number[], targetPoints: number[]) {
  let result: { delta: number; target: number } | null = null;
  for (const source of sourcePoints) {
    for (const target of targetPoints) {
      const delta = target - source;
      if (Math.abs(delta) <= snapThreshold && (result === null || Math.abs(delta) < Math.abs(result.delta))) {
        result = { delta, target };
      }
    }
  }
  return result;
}

function toCanvasJson(canvas: Canvas) {
  ensureObjectIds(canvas);
  return (canvas as Canvas & { toJSON: (properties?: string[]) => Record<string, unknown> }).toJSON(exportProperties);
}

async function createPortableProject(frames: DesignFrame[], zip: JSZip) {
  const project = { frames: structuredClone(frames) as DesignFrame[] };
  for (const frame of project.frames) {
    if (!frame.json) continue;
    const objects = Array.isArray(frame.json.objects) ? frame.json.objects : [];
    for (let index = 0; index < objects.length; index += 1) {
      const object = objects[index] as Record<string, unknown>;
      if (object.type !== 'image' || typeof object.src !== 'string' || !object.src.startsWith('data:')) continue;
      const asset = dataUrlToAsset(object.src, `${frame.id}-${index}`);
      zip.file(`assets/${asset.filename}`, asset.data, { base64: true });
      object.src = `assets/${asset.filename}`;
    }
  }
  return project;
}

async function hydratePortableProject(project: { frames: DesignFrame[] }, zip: JSZip) {
  for (const frame of project.frames) {
    if (!frame.json) continue;
    const objects = Array.isArray(frame.json.objects) ? frame.json.objects : [];
    for (const object of objects) {
      const item = object as Record<string, unknown>;
      if (item.type !== 'image' || typeof item.src !== 'string' || !item.src.startsWith('assets/')) continue;
      const file = zip.file(item.src);
      if (!file) continue;
      item.src = `data:${mimeFromFilename(item.src)};base64,${await file.async('base64')}`;
    }
  }
  return project;
}

function dataUrlToAsset(dataUrl: string, id: string) {
  const [meta, data] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? 'image/png';
  const extension = mime.split('/')[1] ?? 'png';
  return { data, filename: `image-${id}.${extension.replace('jpeg', 'jpg')}` };
}

function mimeFromFilename(filename: string) {
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.webp')) return 'image/webp';
  if (filename.endsWith('.gif')) return 'image/gif';
  return 'image/png';
}

function getObjectName(object: WebsterObject): string {
  return object.objectName ?? object.type ?? 'Object';
}

function isCornerEditable(object: WebsterObject) {
  return object instanceof Rect || object.shapeKind === 'roundedRectPath';
}

function getObjectCornerRadii(object: WebsterObject): CornerRadii {
  if (object.cornerRadii) return object.cornerRadii;
  const radius = object instanceof Rect && typeof object.rx === 'number' ? object.rx : 0;
  return { topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius };
}

function setCornerRadiiMetadata(object: WebsterObject, radii: CornerRadii) {
  object.cornerRadii = radii;
}

function hasUniformRadii(radii: CornerRadii) {
  return radii.topLeft === radii.topRight && radii.topLeft === radii.bottomRight && radii.topLeft === radii.bottomLeft;
}

function createRoundedRectPathFromObject(object: WebsterObject, radii: CornerRadii): WebsterObject | null {
  const width = Number(object.get('width')) || object.getBoundingRect().width;
  const height = Number(object.get('height')) || object.getBoundingRect().height;
  const path = new Path(createRoundedRectPath(width, height, radii), {
    left: object.left,
    top: object.top,
    scaleX: object.scaleX,
    scaleY: object.scaleY,
    angle: object.angle,
    fill: object.get('fill'),
    opacity: object.opacity
  }) as WebsterObject;
  path.objectId = object.objectId;
  path.objectName = getObjectName(object);
  path.shapeKind = 'roundedRectPath';
  path.cornerRadii = radii;
  return path;
}

function createRoundedRectPath(width: number, height: number, radii: CornerRadii) {
  const maxRadius = Math.max(0, Math.min(width, height) / 2);
  const tl = Math.min(radii.topLeft, maxRadius);
  const tr = Math.min(radii.topRight, maxRadius);
  const br = Math.min(radii.bottomRight, maxRadius);
  const bl = Math.min(radii.bottomLeft, maxRadius);
  return [`M ${tl} 0`, `L ${width - tr} 0`, `Q ${width} 0 ${width} ${tr}`, `L ${width} ${height - br}`, `Q ${width} ${height} ${width - br} ${height}`, `L ${bl} ${height}`, `Q 0 ${height} 0 ${height - bl}`, `L 0 ${tl}`, `Q 0 0 ${tl} 0`, 'Z'].join(' ');
}

function colorWithOpacity(color: string, opacity: number) {
  const parsed = parseColor(color);
  const alpha = Math.min(1, Math.max(0, opacity));
  if (!parsed) return color;
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
}

function parseColor(color: string) {
  const hex = color.trim();
  const shortHex = /^#([0-9a-f]{3})$/i.exec(hex);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('').map((value) => parseInt(value + value, 16));
    return { r, g, b, alpha: 1, hex: rgbToHex(r, g, b) };
  }
  const longHex = /^#([0-9a-f]{6})$/i.exec(hex);
  if (longHex) {
    const value = longHex[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return { r, g, b, alpha: 1, hex: rgbToHex(r, g, b) };
  }
  const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)$/i.exec(hex);
  if (!rgba) return null;
  const r = Number(rgba[1]);
  const g = Number(rgba[2]);
  const b = Number(rgba[3]);
  return { r, g, b, alpha: rgba[4] === undefined ? 1 : Number(rgba[4]), hex: rgbToHex(r, g, b) };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`;
}

