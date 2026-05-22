import { Canvas, Circle, Path, Pattern, Rect, Textbox, Triangle } from 'fabric';
import { colorWithOpacity, parseColor } from './color';
import { CornerHandle, CornerRadii, DesignFrame, EditorProject, FillLayer, FillMode, GradientStopItem, LayerItem, ResizeHandle, SnapLine, WebsterObject, createId, defaultProjectName, exportProperties, snapThreshold } from './editorTypes';
export function addStarterObjects(canvas: Canvas, frame: DesignFrame) {
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

export function getLayers(canvas: Canvas, active: WebsterObject | null): LayerItem[] {
  return canvas.getObjects().map((object, index) => {
    const item = object as WebsterObject;
    item.objectId ??= createId();
    item.objectName ??= item.type ?? 'Object';
    return {
      index,
      id: item.objectId,
      name: getObjectName(item),
      type: item.type ?? 'object',
      active: item === active,
      visible: item.visible !== false
    };
  }).reverse();
}

export function ensureObjectIds(canvas: Canvas) {
  (canvas.getObjects() as WebsterObject[]).forEach((object) => {
    object.objectId ??= createId();
    object.objectName ??= object.type ?? 'Object';
    configureSelectionOutline(object);
    ensureFillLayerMetadata(object);
    if (object.fillLayers?.length) applyFillLayersToObject(object);
  });
}

export function configureSelectionOutline(object?: WebsterObject) {
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

export function getCanvasPointer(canvas: Canvas, event: MouseEvent) {
  const pointerCanvas = canvas as Canvas & {
    getScenePoint?: (event: MouseEvent) => { x: number; y: number };
    getPointer?: (event: MouseEvent) => { x: number; y: number };
  };
  return pointerCanvas.getScenePoint?.(event) ?? pointerCanvas.getPointer?.(event) ?? null;
}

export function resizeDrawableObject(object: WebsterObject, start: { x: number; y: number }, end: { x: number; y: number }) {
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

export function normalizeDrawableObject(object: WebsterObject) {
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

export function setCanvasSize(canvas: Canvas, width: number, height: number) {
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

export function setCanvasBackground(canvas: Canvas, color: string | Pattern) {
  (canvas as Canvas & { backgroundColor: string | Pattern }).backgroundColor = color;
  canvas.requestRenderAll();
}

export function getFrameBackgroundFill(frame: DesignFrame) {
  const mode = frame.backgroundMode ?? 'solid';
  if (mode === 'gradient') return createFrameGradientPattern(frame);
  return colorWithOpacity(frame.backgroundColor ?? '#ffffff', frame.backgroundOpacity ?? 1);
}

export function createFrameGradientPattern(frame: DesignFrame) {
  const source = document.createElement('canvas');
  source.width = Math.max(2, frame.width);
  source.height = Math.max(2, frame.height);
  const context = source.getContext('2d');
  if (!context) return colorWithOpacity(frame.backgroundColor ?? '#ffffff', frame.backgroundOpacity ?? 1);
  context.fillStyle = createCanvasGradient(context, source.width, source.height, getFrameStops(frame));
  context.fillRect(0, 0, source.width, source.height);
  return new Pattern({ source, repeat: 'no-repeat' });
}

export function getFrameStops(frame: DesignFrame) {
  return frame.backgroundStops?.length ? frame.backgroundStops : createDefaultGradientStops(frame.backgroundColor ?? '#ffffff', '#d9d9d9');
}

export function createDefaultGradientStops(from: string, to: string) {
  return [
    { id: createId(), offset: 0, color: from, opacity: 1 },
    { id: createId(), offset: 1, color: to, opacity: 1 }
  ];
}

export function createFillLayer(mode: FillMode, color: string, opacity: number): FillLayer {
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

export function getObjectFillLayers(object: WebsterObject): FillLayer[] {
  if (object.fillLayers?.length) return object.fillLayers;
  const fill = object.get('fill');
  if (typeof fill === 'string') {
    const parsed = parseColor(fill);
    return [createFillLayer('solid', parsed?.hex ?? '#1f2937', parsed?.alpha ?? 1)];
  }
  return [createFillLayer('solid', '#1f2937', 1)];
}

export function applyFillLayersToObject(object: WebsterObject) {
  const layers = getObjectFillLayers(object);
  object.fillLayers = layers;
  object.set('fill', createCompositeFill(layers, object));
  object.set('dirty', true);
}

export function refreshObjectFillOnResize(object: WebsterObject) {
  if (!object.fillLayers?.length) return;
  applyFillLayersToObject(object);
}

export function ensureFillLayerMetadata(object: WebsterObject) {
  if (object.fillLayers?.length || object.type === 'image') return;
  const fill = object.get('fill');
  if (typeof fill !== 'string') return;
  const parsed = parseColor(fill);
  object.fillLayers = [createFillLayer('solid', parsed?.hex ?? fill, parsed?.alpha ?? 1)];
}

export function createCompositeFill(layers: FillLayer[], object: WebsterObject) {
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

export function isJsdomRuntime() {
  return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom');
}

export function createCanvasGradient(context: CanvasRenderingContext2D, width: number, height: number, stops: GradientStopItem[]) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  stops
    .map((stop) => ({ ...stop, offset: Math.min(1, Math.max(0, stop.offset)) }))
    .sort((a, b) => a.offset - b.offset)
    .forEach((stop) => {
      gradient.addColorStop(stop.offset, colorWithOpacity(stop.color, stop.opacity));
    });
  return gradient;
}

export function createGradientPreview(stops: GradientStopItem[]) {
  return `linear-gradient(90deg, ${stops
    .map((stop) => `${colorWithOpacity(stop.color, stop.opacity)} ${Math.round(stop.offset * 100)}%`)
    .join(', ')})`;
}

export function clampFrameSize(value: number) {
  return Math.max(100, Math.min(4000, Math.round(Number.isFinite(value) ? value : 100)));
}

export function getCornerHandles(object: WebsterObject): CornerHandle[] {
  const box = object.getBoundingRect();
  const inset = Math.max(10, Math.min(24, box.width / 3, box.height / 3));
  return [
    { key: 'topLeft', left: box.left + inset, top: box.top + inset, cursor: 'grab' },
    { key: 'topRight', left: box.left + box.width - inset, top: box.top + inset, cursor: 'grab' },
    { key: 'bottomRight', left: box.left + box.width - inset, top: box.top + box.height - inset, cursor: 'grab' },
    { key: 'bottomLeft', left: box.left + inset, top: box.top + box.height - inset, cursor: 'grab' }
  ];
}

export function getResizeHandles(object: WebsterObject): ResizeHandle[] {
  const box = object.getBoundingRect();
  return [
    { key: 'topLeft', left: box.left, top: box.top, cursor: 'nwse-resize' },
    { key: 'topRight', left: box.left + box.width, top: box.top, cursor: 'nesw-resize' },
    { key: 'bottomRight', left: box.left + box.width, top: box.top + box.height, cursor: 'nwse-resize' },
    { key: 'bottomLeft', left: box.left, top: box.top + box.height, cursor: 'nesw-resize' }
  ];
}

export function getResizeAnchorOrigin(corner: keyof CornerRadii): { x: 'left' | 'right'; y: 'top' | 'bottom' } {
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

export function getDynamicAnchorOrigin(anchor: { x: number; y: number }, pointerX: number, pointerY: number): { x: 'left' | 'right'; y: 'top' | 'bottom' } {
  return {
    x: pointerX >= anchor.x ? 'left' : 'right',
    y: pointerY >= anchor.y ? 'top' : 'bottom'
  };
}

export function getResizePointerCoordinate(
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

export function getCornerRadiusDelta(corner: keyof CornerRadii, dx: number, dy: number) {
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

export function clampRadius(value: number, maxRadius: number) {
  return Math.round(Math.max(0, Math.min(maxRadius, value)));
}

export function clampOpacity(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
}

export function clampZoom(value: number) {
  return Math.min(2, Math.max(0.2, Number(value.toFixed(2))));
}

export function snapMovingObject(canvas: Canvas, movingObject?: WebsterObject, onSnapLinesChange?: (lines: SnapLine[]) => void) {
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

export function closestSnap(sourcePoints: number[], targetPoints: number[]) {
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

export function toCanvasJson(canvas: Canvas) {
  ensureObjectIds(canvas);
  const rawJson = (canvas as Canvas & { toJSON: (properties?: string[]) => Record<string, unknown> }).toJSON(exportProperties);
  return normalizeCanvasJson(rawJson);
}

export function createEditorProjectSnapshot(frames: DesignFrame[]): EditorProject {
  const nextFrames = structuredClone(frames) as DesignFrame[];
  for (const frame of nextFrames) {
    frame.json = normalizeFrameJson(frame.json);
  }
  return { frames: nextFrames };
}

export function getObjectName(object: WebsterObject): string {
  return object.objectName ?? object.type ?? 'Object';
}

export function parseEditorProjectData(project: unknown): DesignFrame[] | null {
  if (!isRecord(project) || !Array.isArray(project.frames) || project.frames.length === 0) {
    return null;
  }

  const nextFrames: DesignFrame[] = [];
  for (const frame of project.frames) {
    if (!isRecord(frame)) {
      return null;
    }

    const width = clampFrameSize(typeof frame.width === 'number' ? frame.width : Number(frame.width));
    const height = clampFrameSize(typeof frame.height === 'number' ? frame.height : Number(frame.height));
    const id = typeof frame.id === 'string' && frame.id.trim() ? frame.id : createId();
    const name = typeof frame.name === 'string' && frame.name.trim() ? frame.name : 'Untitled frame';
    const description = typeof frame.description === 'string' ? frame.description : '';
    const backgroundColor = typeof frame.backgroundColor === 'string' ? frame.backgroundColor : '#ffffff';
    const backgroundOpacity = clampOpacity(typeof frame.backgroundOpacity === 'number' ? frame.backgroundOpacity : Number(frame.backgroundOpacity ?? 1));
    const backgroundMode = frame.backgroundMode === 'gradient' ? 'gradient' : 'solid';
    const backgroundStops = normalizeGradientStops(frame.backgroundStops, backgroundColor);
    const json = normalizeFrameJson(frame.json);

    nextFrames.push({
      id,
      name,
      description,
      width,
      height,
      backgroundColor,
      backgroundOpacity,
      backgroundMode,
      backgroundStops,
      json
    });
  }

  return nextFrames;
}

export function normalizeFrameJson(json: unknown): Record<string, unknown> | undefined {
  if (!isRecord(json)) {
    return undefined;
  }

  return normalizeCanvasJson(json);
}

function normalizeCanvasJson(json: Record<string, unknown>): Record<string, unknown> {
  const nextJson = structuredClone(json) as Record<string, unknown>;
  if (!Array.isArray(nextJson.objects)) {
    nextJson.objects = [];
    return nextJson;
  }

  nextJson.objects = nextJson.objects
    .filter(isRecord)
    .map((entry) => normalizeCanvasObject(entry));

  return nextJson;
}

function normalizeCanvasObject(entry: Record<string, unknown>): Record<string, unknown> {
  const nextEntry = structuredClone(entry) as Record<string, unknown>;

  if (Array.isArray(nextEntry.objects)) {
    nextEntry.objects = nextEntry.objects
      .filter(isRecord)
      .map((child) => normalizeCanvasObject(child));
  }

  if (isRecord(nextEntry.fill)) {
    nextEntry.fill = getSerializableFillValue(nextEntry);
  }

  return nextEntry;
}

function getSerializableFillValue(entry: Record<string, unknown>): string {
  const fillLayers = Array.isArray(entry.fillLayers) ? entry.fillLayers.filter(isRecord) : [];
  const firstLayer = fillLayers[0];

  if (firstLayer) {
    const layerColor = typeof firstLayer.color === 'string' ? firstLayer.color : '#1f2937';
    const layerOpacity = clampOpacity(typeof firstLayer.opacity === 'number' ? firstLayer.opacity : Number(firstLayer.opacity ?? 1));

    if (firstLayer.mode === 'gradient' && Array.isArray(firstLayer.stops)) {
      const firstStop = firstLayer.stops.find(isRecord);
      if (firstStop) {
        const stopColor = typeof firstStop.color === 'string' ? firstStop.color : layerColor;
        const stopOpacity = clampOpacity(typeof firstStop.opacity === 'number' ? firstStop.opacity : Number(firstStop.opacity ?? layerOpacity));
        return colorWithOpacity(stopColor, stopOpacity);
      }
    }

    return colorWithOpacity(layerColor, layerOpacity);
  }

  return '#1f2937';
}

export function normalizeGradientStops(stops: unknown, backgroundColor: string) {
  if (!Array.isArray(stops) || stops.length === 0) {
    return createDefaultGradientStops(backgroundColor, '#d9d9d9');
  }

  const nextStops = stops
    .filter(isRecord)
    .map((stop) => ({
      id: typeof stop.id === 'string' && stop.id.trim() ? stop.id : createId(),
      offset: Math.min(1, Math.max(0, typeof stop.offset === 'number' ? stop.offset : Number(stop.offset ?? 0))),
      color: typeof stop.color === 'string' ? stop.color : backgroundColor,
      opacity: clampOpacity(typeof stop.opacity === 'number' ? stop.opacity : Number(stop.opacity ?? 1))
    }))
    .sort((a, b) => a.offset - b.offset);

  return nextStops.length > 0 ? nextStops : createDefaultGradientStops(backgroundColor, '#d9d9d9');
}

export function deriveProjectName(frames: DesignFrame[]) {
  return frames[0]?.name?.trim() || defaultProjectName;
}

export function formatSavedProjectDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown update time';
  }

  return `Updated ${date.toLocaleString()}`;
}

export function formatRelativeProjectTime(value: string, verb = 'Edited') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `${verb} recently`;
  }

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return `${verb} just now`;
  }
  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${verb} ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return `${verb} ${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diffMs < day * 2) {
    return `${verb} yesterday`;
  }

  const days = Math.max(2, Math.floor(diffMs / day));
  return `${verb} ${days} days ago`;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) {
    return 'Network request failed. Check that the backend is running and reachable.';
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isCornerEditable(object: WebsterObject) {
  return object instanceof Rect || object.shapeKind === 'roundedRectPath';
}

export function getObjectCornerRadii(object: WebsterObject): CornerRadii {
  if (object.cornerRadii) return object.cornerRadii;
  const radius = object instanceof Rect && typeof object.rx === 'number' ? object.rx : 0;
  return { topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius };
}

export function setCornerRadiiMetadata(object: WebsterObject, radii: CornerRadii) {
  object.cornerRadii = radii;
}

export function hasUniformRadii(radii: CornerRadii) {
  return radii.topLeft === radii.topRight && radii.topLeft === radii.bottomRight && radii.topLeft === radii.bottomLeft;
}

export function createRoundedRectPathFromObject(object: WebsterObject, radii: CornerRadii): WebsterObject | null {
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

export function createRoundedRectPath(width: number, height: number, radii: CornerRadii) {
  const maxRadius = Math.max(0, Math.min(width, height) / 2);
  const tl = Math.min(radii.topLeft, maxRadius);
  const tr = Math.min(radii.topRight, maxRadius);
  const br = Math.min(radii.bottomRight, maxRadius);
  const bl = Math.min(radii.bottomLeft, maxRadius);
  return [`M ${tl} 0`, `L ${width - tr} 0`, `Q ${width} 0 ${width} ${tr}`, `L ${width} ${height - br}`, `Q ${width} ${height} ${width - br} ${height}`, `L ${bl} ${height}`, `Q 0 ${height} 0 ${height - bl}`, `L 0 ${tl}`, `Q 0 0 ${tl} 0`, 'Z'].join(' ');
}
