import { ChangeEvent, Dispatch, MutableRefObject, RefObject, SetStateAction, useEffect, useRef } from 'react';
import { Canvas, Circle, FabricImage, Path, Point, Rect, Textbox, Triangle } from 'fabric';
import { colorWithOpacity } from '../lib/color';
import {
  CornerHandle, CornerRadii, FillLayer, FillMode, GradientStopItem,
  LayerItem, ResizeHandle, SnapLine, ToolMode, WebsterObject, createId, exportProperties
} from '../lib/editorTypes';
import {
  applyFillLayersToObject,
  clampRadius,
  configureSelectionOutline,
  createFillLayer,
  createRoundedRectPath,
  createRoundedRectPathFromObject,
  getCornerHandles,
  getCornerRadiusDelta,
  getDynamicAnchorOrigin,
  getLayers,
  getObjectCornerRadii,
  getObjectFillLayers,
  getObjectName,
  getResizeAnchorOrigin,
  getResizeHandles,
  getResizePointerCoordinate,
  hasUniformRadii,
  isCornerEditable,
  refreshObjectFillOnResize,
  setCornerRadiiMetadata
} from '../lib/editorHelpers';

interface StyleSettings {
  cornerRadii: CornerRadii;
  fillColor: string;
  fillOpacity: number;
  fontFamily: string;
  fontSize: number;
}

interface Params {
  fabricCanvasRef: MutableRefObject<Canvas | null>;
  activeFrameRef: MutableRefObject<HTMLDivElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  styleSettingsRef: MutableRefObject<StyleSettings>;
  activeFrame: { width: number; height: number };
  selectedObject: WebsterObject | null;
  cornerRadii: CornerRadii;
  fillColor: string;
  fillOpacity: number;
  fillMode: FillMode;
  gradientStops: GradientStopItem[];
  activeFillLayerId: string;
  fillLayers: FillLayer[];
  setSelectedObject: (obj: WebsterObject | null) => void;
  setLayers: (layers: LayerItem[]) => void;
  setCornerHandles: (handles: CornerHandle[]) => void;
  setResizeHandles: (handles: ResizeHandle[]) => void;
  setCornerRadii: (radii: CornerRadii) => void;
  setFillLayers: (layers: FillLayer[]) => void;
  setActiveFillLayerId: (id: string) => void;
  setFillColor: (color: string) => void;
  setFillOpacity: (opacity: number) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setRotation: (value: number) => void;
  setFillMode: (mode: FillMode) => void;
  setGradientStops: Dispatch<SetStateAction<GradientStopItem[]>>;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setElementWidth: (w: number) => void;
  setElementHeight: (h: number) => void;
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  setSnapLines: (lines: SnapLine[]) => void;
  saveCurrentFrame: (recordHistory?: boolean) => void;
}

export function useObjectActions({
  fabricCanvasRef, activeFrameRef, fileInputRef, styleSettingsRef,
  activeFrame, selectedObject, cornerRadii, fillColor, fillOpacity,
  fillMode, gradientStops, activeFillLayerId, fillLayers,
  setSelectedObject, setLayers, setCornerHandles, setResizeHandles,
  setCornerRadii, setFillLayers, setActiveFillLayerId, setFillColor,
  setFillOpacity, setStrokeColor, setStrokeWidth, setRotation, setFillMode, setGradientStops, setOpacity,
  setFontSize, setFontFamily, setElementWidth, setElementHeight,
  setTextAlign, setSnapLines,
  saveCurrentFrame
}: Params) {
  const getActiveTarget = () =>
    ((fabricCanvasRef.current?.getActiveObject() as WebsterObject | undefined) ?? selectedObject ?? null);
  const getObjectScaledSize = (object: WebsterObject) => {
    const target = object as WebsterObject & {
      getScaledWidth?: () => number;
      getScaledHeight?: () => number;
    };
    const scaledWidth = target.getScaledWidth?.();
    const scaledHeight = target.getScaledHeight?.();
    return {
      width: typeof scaledWidth === 'number' && Number.isFinite(scaledWidth) ? scaledWidth : object.getBoundingRect().width,
      height: typeof scaledHeight === 'number' && Number.isFinite(scaledHeight) ? scaledHeight : object.getBoundingRect().height
    };
  };
  const getObjectBaseSize = (object: WebsterObject) => {
    const widthRaw = Number(object.get('width'));
    const heightRaw = Number(object.get('height'));
    const width = Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : object.getBoundingRect().width / Math.max(0.0001, Math.abs(object.scaleX ?? 1));
    const height = Number.isFinite(heightRaw) && heightRaw > 0 ? heightRaw : object.getBoundingRect().height / Math.max(0.0001, Math.abs(object.scaleY ?? 1));
    return { width, height };
  };
  const toLocalRadii = (object: WebsterObject, radii: CornerRadii): CornerRadii => {
    const baseSize = getObjectBaseSize(object);
    const scaleX = Math.max(0.0001, Math.abs(object.scaleX ?? 1));
    const scaleY = Math.max(0.0001, Math.abs(object.scaleY ?? 1));
    const minScale = Math.min(scaleX, scaleY);
    const maxDisplayed = Math.max(0, Math.min(baseSize.width * scaleX, baseSize.height * scaleY) / 2);
    const normalize = (value: number) => Math.max(0, Math.min(maxDisplayed, value)) / minScale;
    return {
      topLeft: normalize(radii.topLeft),
      topRight: normalize(radii.topRight),
      bottomRight: normalize(radii.bottomRight),
      bottomLeft: normalize(radii.bottomLeft)
    };
  };

  const applyImageCornerRadii = (target: WebsterObject, radii: CornerRadii) => {
    const imageObject = target as WebsterObject & { width?: number; height?: number; clipPath?: unknown };
    const width = typeof imageObject.width === 'number' ? imageObject.width : 0;
    const height = typeof imageObject.height === 'number' ? imageObject.height : 0;
    if (width <= 0 || height <= 0) return;
    const scaleX = Math.max(0.0001, Math.abs(imageObject.scaleX ?? 1));
    const scaleY = Math.max(0.0001, Math.abs(imageObject.scaleY ?? 1));
    const maxDisplayedRadius = Math.max(0, Math.min(width * scaleX, height * scaleY) / 2);
    const normalizeRadius = (value: number) =>
      Math.max(0, Math.min(maxDisplayedRadius, value)) / Math.min(scaleX, scaleY);
    const normalizedRadii: CornerRadii = {
      topLeft: normalizeRadius(radii.topLeft),
      topRight: normalizeRadius(radii.topRight),
      bottomRight: normalizeRadius(radii.bottomRight),
      bottomLeft: normalizeRadius(radii.bottomLeft)
    };
    const hasRadius = Object.values(normalizedRadii).some((item) => item > 0);
    if (!hasRadius) {
      imageObject.clipPath = undefined;
      setCornerRadiiMetadata(imageObject, { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 });
      return;
    }
    imageObject.clipPath = new Path(createRoundedRectPath(width, height, normalizedRadii), {
      originX: 'left',
      originY: 'top',
      left: -width / 2,
      top: -height / 2,
      fill: '#000000',
      absolutePositioned: false
    });
    const clipPathObject = imageObject.clipPath as { dirty?: boolean } | undefined;
    if (clipPathObject) {
      clipPathObject.dirty = true;
    }
    (imageObject as { dirty?: boolean }).dirty = true;
    (imageObject as WebsterObject & { setCoords?: () => void }).setCoords?.();
    setCornerRadiiMetadata(imageObject, radii);
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

  const addTextAt = (left: number, top: number) => {
    const settings = styleSettingsRef.current;
    addObject(
      new Textbox('Double click to edit', {
        left, top, originX: 'left', originY: 'top', width: 420,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        fill: colorWithOpacity(settings.fillColor, settings.fillOpacity),
        fontWeight: 700
      }) as WebsterObject,
      'Text'
    );
  };

  const addText = () => addTextAt(120, 120);

  const addTextPreset = (content: string, name: string, fontSizeValue: number, fontWeight: number, width = 460) => {
    const settings = styleSettingsRef.current;
    addObject(
      new Textbox(content, {
        left: 120, top: 120, originX: 'left', originY: 'top', width,
        fontFamily: settings.fontFamily, fontSize: fontSizeValue,
        fontWeight, fill: colorWithOpacity(settings.fillColor, settings.fillOpacity)
      }) as WebsterObject,
      name
    );
  };

  const addHeadingText = () => addTextPreset('Add your headline', 'Heading', 72, 800, 520);
  const addSubheadingText = () => addTextPreset('Add a short supporting message', 'Subheading', 40, 700, 520);
  const addBodyText = () => addTextPreset('Add body text with details for your design.', 'Body text', 26, 500, 460);

  const createDrawableObject = (tool: ToolMode, left: number, top: number): WebsterObject | null => {
    const settings = styleSettingsRef.current;
    const fillValue = colorWithOpacity(settings.fillColor, settings.fillOpacity);
    if (tool === 'box') {
      const rect = new Rect({
        left, top, originX: 'left', originY: 'top', width: 1, height: 1,
        rx: settings.cornerRadii.topLeft, ry: settings.cornerRadii.topLeft, fill: fillValue
      }) as WebsterObject;
      setCornerRadiiMetadata(rect, settings.cornerRadii);
      rect.objectId = createId();
      rect.objectName = 'Rectangle';
      rect.fillLayers = [createFillLayer('solid', settings.fillColor, settings.fillOpacity)];
      applyFillLayersToObject(rect);
      return rect;
    }
    if (tool === 'circle') {
      const circle = new Circle({ left, top, originX: 'left', originY: 'top', radius: 1, fill: fillValue }) as WebsterObject;
      circle.objectId = createId();
      circle.objectName = 'Circle';
      circle.fillLayers = [createFillLayer('solid', settings.fillColor, settings.fillOpacity)];
      applyFillLayersToObject(circle);
      return circle;
    }
    if (tool === 'shape') {
      const triangle = new Triangle({ left, top, originX: 'left', originY: 'top', width: 1, height: 1, fill: fillValue }) as WebsterObject;
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
      left: 180, top: 180, originX: 'left', originY: 'top', width: 280, height: 180,
      rx: cornerRadii.topLeft, ry: cornerRadii.topLeft, fill: colorWithOpacity(fillColor, fillOpacity)
    }) as WebsterObject;
    setCornerRadiiMetadata(rect, cornerRadii);
    addObject(rect, 'Rectangle');
  };

  const addCircle = () => {
    addObject(
      new Circle({ left: 220, top: 220, originX: 'left', originY: 'top', radius: 110, fill: colorWithOpacity(fillColor, fillOpacity) }) as WebsterObject,
      'Circle'
    );
  };

  const addTriangle = () => {
    addObject(
      new Triangle({ left: 250, top: 220, originX: 'left', originY: 'top', width: 240, height: 220, fill: colorWithOpacity(fillColor, fillOpacity) }) as WebsterObject,
      'Triangle'
    );
  };

  const addArrow = () => {
    const arrowPath = new Path('M 20 105 L 300 105 L 300 60 L 420 150 L 300 240 L 300 195 L 20 195 z', {
      left: 160,
      top: 180,
      originX: 'left',
      originY: 'top',
      fill: colorWithOpacity(fillColor, fillOpacity)
    }) as WebsterObject;
    arrowPath.shapeKind = 'arrow';
    addObject(arrowPath, 'Arrow');
  };

  const clipboardRef = useRef<WebsterObject | null>(null);

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
    clipboardRef.current = clone;
  };

  const pasteSelected = async () => {
    const canvas = fabricCanvasRef.current;
    const source = clipboardRef.current as (WebsterObject & { clone?: (properties?: string[]) => Promise<WebsterObject> }) | null;
    if (!canvas || !source?.clone) return;
    const clone = await source.clone(exportProperties);
    clone.set({ left: (clone.left ?? 0) + 24, top: (clone.top ?? 0) + 24 });
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

  const nudgeSelected = (deltaX: number, deltaY: number) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject() as WebsterObject | undefined;
    if (!canvas || !active) {
      return;
    }

    const currentLeft = typeof active.left === 'number' ? active.left : 0;
    const currentTop = typeof active.top === 'number' ? active.top : 0;
    active.set({ left: currentLeft + deltaX, top: currentTop + deltaY });
    (active as WebsterObject & { setCoords?: () => void }).setCoords?.();
    canvas.requestRenderAll();
    setLayers(getLayers(canvas, active));
    saveCurrentFrame(true);
  };

  const selectLayer = (index: number) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getObjects()[index] as WebsterObject | undefined;
    if (!canvas || !object || object.visible === false) return;
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    setSelectedObject(object);
    setLayers(getLayers(canvas, object));
  };

  const toggleLayerVisibility = (index: number) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getObjects()[index] as WebsterObject | undefined;
    if (!canvas || !object) return;
    const nextVisible = object.visible === false;
    object.set({ visible: nextVisible, selectable: nextVisible, evented: nextVisible });
    if (!nextVisible && canvas.getActiveObject() === object) {
      canvas.discardActiveObject();
      setSelectedObject(null);
    }
    canvas.requestRenderAll();
    setLayers(getLayers(canvas, nextVisible ? object : null));
    saveCurrentFrame(true);
  };

  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const canvas = fabricCanvasRef.current as (Canvas & {
      bringObjectForward?: (object: WebsterObject) => boolean;
      sendObjectBackwards?: (object: WebsterObject) => boolean;
    }) | null;
    const object = canvas?.getObjects()[index] as WebsterObject | undefined;
    if (!canvas || !object) return;
    if (direction === 'up') canvas.bringObjectForward?.(object);
    else canvas.sendObjectBackwards?.(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    setSelectedObject(object);
    setLayers(getLayers(canvas, object));
    saveCurrentFrame(true);
  };

  const exportFrame = async (activeFrame: { name: string }, format: 'png' | 'jpg' | 'pdf' = 'png') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const safeName = activeFrame.name.toLowerCase().replace(/\s+/g, '-');

    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const width = canvas.getWidth();
      const height = canvas.getHeight();
      const orientation = width >= height ? 'landscape' : 'portrait';
      const imageData = canvas.toDataURL({ format: 'png', multiplier: 1 });

      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [width, height]
      });

      pdf.addImage(imageData, 'PNG', 0, 0, width, height);
      pdf.save(`${safeName}.pdf`);
      return;
    }

    const imageFormat = format === 'jpg' ? 'jpeg' : 'png';
    const extension = format === 'jpg' ? 'jpg' : 'png';
    const link = document.createElement('a');
    link.download = `${safeName}.${extension}`;
    link.href = canvas.toDataURL({ format: imageFormat, multiplier: 1, quality: 1 });
    link.click();
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || typeof reader.result !== 'string') return;
      const optimizedImageDataUrl = await optimizeImageDataUrl(reader.result);
      const image = (await FabricImage.fromURL(optimizedImageDataUrl)) as WebsterObject;
      image.scaleToWidth(420);
      image.set({ left: 120, top: 160 });
      addObject(image, 'Image');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const optimizeImageDataUrl = (dataUrl: string): Promise<string> => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxSide = 1600;
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      const offscreen = document.createElement('canvas');
      offscreen.width = targetWidth;
      offscreen.height = targetHeight;
      const context = offscreen.getContext('2d');
      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(offscreen.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

  const selectFillLayer = (layer: FillLayer) => {
    setActiveFillLayerId(layer.id);
    setFillColor(layer.color);
    setFillOpacity(layer.opacity);
    setFillMode(layer.mode);
    setGradientStops(layer.stops);
  };

  const updateActiveFillLayer = (patch: Partial<Omit<FillLayer, 'id'>>) => {
    const active = selectedObject;
    if (!active || active.type === 'image') return;
    const currentLayers = getObjectFillLayers(active);
    const targetId = activeFillLayerId || currentLayers[0].id;
    const nextLayers = currentLayers.map((layer) => (layer.id === targetId ? { ...layer, ...patch } : layer));
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

  const addFillLayer = (mode: FillMode) => {
    const active = selectedObject;
    if (!active || active.type === 'image') return;
    const nextLayer = createFillLayer(mode, mode === 'solid' ? '#000000' : '#2563eb', mode === 'solid' ? 0.2 : 1);
    const nextLayers = [nextLayer, ...getObjectFillLayers(active)];
    active.fillLayers = nextLayers;
    setFillLayers(nextLayers);
    selectFillLayer(nextLayer);
    applyFillLayersToObject(active);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
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
    getActiveTarget()?.set('opacity', value);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateFontSize = (value: number) => {
    setFontSize(value);
    getActiveTarget()?.set('fontSize', value);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateFontFamily = (value: string) => {
    setFontFamily(value);
    getActiveTarget()?.set('fontFamily', value);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateElementWidth = (value: number) => {
    const active = getActiveTarget();
    if (!active) return;
    const nextWidth = Math.max(1, value);
    const { width: currentWidth } = getObjectScaledSize(active);
    if (currentWidth <= 0.0001) return;
    const factor = nextWidth / currentWidth;
    active.set('scaleX', (active.scaleX || 1) * factor);
    setElementWidth(Math.round(nextWidth));
    (active as WebsterObject & { setCoords?: () => void }).setCoords?.();
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateElementHeight = (value: number) => {
    const active = getActiveTarget();
    if (!active) return;
    const nextHeight = Math.max(1, value);
    const { height: currentHeight } = getObjectScaledSize(active);
    if (currentHeight <= 0.0001) return;
    const factor = nextHeight / currentHeight;
    active.set('scaleY', (active.scaleY || 1) * factor);
    setElementHeight(Math.round(nextHeight));
    (active as WebsterObject & { setCoords?: () => void }).setCoords?.();
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateTextAlign = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align);
    getActiveTarget()?.set('textAlign', align);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateStroke = (color: string, width: number) => {
    const active = getActiveTarget();
    if (!active) return;
    active.set({
      stroke: width > 0 ? color : null,
      strokeWidth: width,
      strokeUniform: true
    });
    const radii = getObjectCornerRadii(active);
    if (active.type === 'image' && radii.topLeft > 0) {
      applyImageCornerRadii(active, radii);
    }
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateStrokeColor = (color: string) => {
    setStrokeColor(color);
    const activeWidth = getActiveTarget()?.get('strokeWidth');
    const width = typeof activeWidth === 'number' ? activeWidth : 0;
    updateStroke(color, width);
  };

  const updateStrokeWidth = (value: number) => {
    const nextWidth = Math.max(0, value);
    setStrokeWidth(nextWidth);
    const activeStroke = getActiveTarget()?.get('stroke');
    const color = typeof activeStroke === 'string' ? activeStroke : '#000000';
    updateStroke(color, nextWidth);
  };

  const updateRotation = (value: number) => {
    const next = Number.isFinite(value) ? value : 0;
    setRotation(next);
    const active = getActiveTarget();
    active?.set('angle', next);
    (active as WebsterObject & { setCoords?: () => void } | null)?.setCoords?.();
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const updateImageCornerRadius = (value: number) => {
    const active = getActiveTarget();
    if (!active || active.type !== 'image') return;
    const next = Math.max(0, value);
    const nextRadii = { topLeft: next, topRight: next, bottomRight: next, bottomLeft: next };
    setCornerRadii(nextRadii);
    applyImageCornerRadii(active, nextRadii);
    fabricCanvasRef.current?.requestRenderAll();
    saveCurrentFrame(true);
  };

  const applyCornerRadiiToActive = (radii: CornerRadii, recordHistory: boolean) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject() as WebsterObject | undefined;
    if (!canvas || !active || !isCornerEditable(active)) return;
    const localRadii = toLocalRadii(active, radii);
    if (active.shapeKind === 'roundedRectPath' && hasUniformRadii(radii)) {
      const width = Number(active.get('width')) || active.getBoundingRect().width;
      const height = Number(active.get('height')) || active.getBoundingRect().height;
      const center = active.getCenterPoint();
      const replacement = new Rect({
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
        width,
        height,
        rx: localRadii.topLeft,
        ry: localRadii.topLeft,
        scaleX: active.scaleX,
        scaleY: active.scaleY,
        skewX: active.skewX,
        skewY: active.skewY,
        flipX: active.flipX,
        flipY: active.flipY,
        angle: active.angle,
        fill: active.get('fill'),
        opacity: active.opacity,
        stroke: active.get('stroke'),
        strokeWidth: active.get('strokeWidth'),
        strokeUniform: active.get('strokeUniform')
      }) as WebsterObject;
      replacement.objectId = active.objectId;
      replacement.objectName = active.objectName;
      replacement.fillLayers = active.fillLayers;
      setCornerRadiiMetadata(replacement, radii);
      canvas.remove(active);
      canvas.add(replacement);
      canvas.setActiveObject(replacement);
      setSelectedObject(replacement);
      canvas.requestRenderAll();
      setCornerHandles(getCornerHandles(replacement));
      setResizeHandles(getResizeHandles(replacement));
      saveCurrentFrame(recordHistory);
      return;
    }
    if (active.type === 'image') {
      applyImageCornerRadii(active, radii);
      canvas.requestRenderAll();
      setSelectedObject(active);
      setCornerHandles(getCornerHandles(active));
      setResizeHandles(getResizeHandles(active));
      saveCurrentFrame(recordHistory);
      return;
    }
    if (active instanceof Rect && hasUniformRadii(radii)) {
      active.set({ rx: localRadii.topLeft, ry: localRadii.topLeft });
      setCornerRadiiMetadata(active, radii);
      canvas.requestRenderAll();
      setSelectedObject(active);
      setCornerHandles(getCornerHandles(active));
      setResizeHandles(getResizeHandles(active));
      saveCurrentFrame(recordHistory);
      return;
    }
    const replacement = createRoundedRectPathFromObject(active, localRadii);
    if (!replacement) return;
    setCornerRadiiMetadata(replacement, radii);
    canvas.remove(active);
    canvas.add(replacement);
    canvas.setActiveObject(replacement);
    setSelectedObject(replacement);
    canvas.requestRenderAll();
    setCornerHandles(getCornerHandles(replacement));
    setResizeHandles(getResizeHandles(replacement));
    saveCurrentFrame(recordHistory);
  };

  const updateCornerRadius = (corner: keyof CornerRadii, value: number) => {
    const active = getActiveTarget();
    const box = active?.getBoundingRect();
    const maxRadius = box ? Math.max(0, Math.min(box.width, box.height) / 2) : Number.MAX_SAFE_INTEGER;
    const nextValue = clampRadius(value, maxRadius);
    const next = { ...cornerRadii, [corner]: nextValue };
    setCornerRadii(next);
    applyCornerRadiiToActive(next, true);
  };

  const startResizeDrag = (event: React.PointerEvent<HTMLButtonElement>, corner: keyof CornerRadii) => {
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
      active.set({
        scaleX: (nextWidth / Math.max(1, startBox.width)) * startScaleX,
        scaleY: (nextHeight / Math.max(1, startBox.height)) * startScaleY
      });
      const nextAnchorOrigin = getDynamicAnchorOrigin(anchor, pointerX, pointerY);
      active.setPositionByOrigin(new Point(anchor.x, anchor.y), nextAnchorOrigin.x, nextAnchorOrigin.y);
      active.setCoords();
      refreshObjectFillOnResize(active);
      const scaled = getObjectScaledSize(active);
      setElementWidth(Math.round(scaled.width));
      setElementHeight(Math.round(scaled.height));
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

  const startCornerRadiusDrag = (event: React.PointerEvent<HTMLButtonElement>, corner: keyof CornerRadii) => {
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
      const nextRadius = clampRadius(startRadii[corner] + delta, maxRadius);
      const nextRadii = moveEvent.ctrlKey
        ? { ...startRadii, [corner]: nextRadius }
        : { topLeft: nextRadius, topRight: nextRadius, bottomRight: nextRadius, bottomLeft: nextRadius };
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
    setGradientStops((current) =>
      [...current, { id: createId(), offset: 0.5, color: '#2563eb', opacity: 1 }].sort((a, b) => a.offset - b.offset)
    );
  };

  const updateGradientStop = (id: string, patch: Partial<Pick<GradientStopItem, 'offset' | 'color' | 'opacity'>>) => {
    const next = gradientStops.map((stop) => (stop.id === id ? { ...stop, ...patch } : stop)).sort((a, b) => a.offset - b.offset);
    setGradientStops(next);
    if (fillMode === 'gradient') updateActiveFillLayer({ stops: next });
  };

  const removeGradientStop = (id: string) => {
    setGradientStops((current) => current.length <= 2 ? current : current.filter((stop) => stop.id !== id));
  };

  return {
    clipboardRef,
    addObject, addText, addTextAt, addHeadingText, addSubheadingText, addBodyText,
    createDrawableObject, addRect, addCircle, addTriangle, addArrow,
    removeSelected, copySelected, pasteSelected, nudgeSelected,
    selectLayer, toggleLayerVisibility, moveLayer,
    exportFrame, handleImageUpload,
    selectFillLayer, updateActiveFillLayer, updateFill, updateFillOpacity,
    applyFillMode, addFillLayer, removeFillLayer,
    updateOpacity, updateStrokeColor, updateStrokeWidth, updateRotation, updateImageCornerRadius, updateFontSize, updateFontFamily,
    updateElementWidth, updateElementHeight, updateTextAlign,
    applyCornerRadiiToActive, updateCornerRadius,
    startResizeDrag, startCornerRadiusDrag,
    addGradientStop, updateGradientStop, removeGradientStop
  };
}
