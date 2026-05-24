import { Dispatch, MutableRefObject, SetStateAction, useEffect } from 'react';
import { Canvas, PencilBrush } from 'fabric';
import {
  CornerHandle, DesignFrame, FillLayer, FillMode, FrameHistory,
  GradientStopItem, LayerItem, ResizeHandle, SnapLine, ToolMode, WebsterObject
} from '../lib/editorTypes';
import { createId } from '../lib/editorTypes';
import {
  addStarterObjects, configureSelectionOutline, ensureObjectIds,
  getCanvasPointer, getCornerHandles, getFrameBackgroundFill,
  getLayers, getObjectCornerRadii, getObjectFillLayers,
  getResizeHandles, isCornerEditable, normalizeDrawableObject,
  resizeDrawableObject, setCanvasBackground, snapMovingObject, toCanvasJson
} from '../lib/editorHelpers';

interface StyleSettings {
  cornerRadii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number };
  fillColor: string;
  fillOpacity: number;
  fontFamily: string;
  fontSize: number;
}

interface Params {
  canvasElementRef: MutableRefObject<HTMLCanvasElement | null>;
  fabricCanvasRef: MutableRefObject<Canvas | null>;
  framesRef: MutableRefObject<DesignFrame[]>;
  historyRef: MutableRefObject<Record<string, FrameHistory>>;
  activeToolRef: MutableRefObject<ToolMode>;
  spacePressedRef: MutableRefObject<boolean>;
  drawingObjectRef: MutableRefObject<WebsterObject | null>;
  drawStartRef: MutableRefObject<{ x: number; y: number }>;
  activeFrameId: string;
  workspaceMode: 'templates' | 'editor';
  isReadOnly: boolean;
  canvasReloadNonce: number;
  isProjectHydrating: boolean;
  addTextAt: (x: number, y: number) => void;
  createDrawableObject: (tool: ToolMode, x: number, y: number) => WebsterObject | null;
  saveCurrentFrame: (recordHistory?: boolean) => void;
  persistFrameJson: (frameId: string, json: Record<string, unknown>) => void;
  setSelectedObject: (obj: WebsterObject | null) => void;
  setLayers: (layers: LayerItem[]) => void;
  setCornerHandles: (handles: CornerHandle[]) => void;
  setResizeHandles: (handles: ResizeHandle[]) => void;
  setActiveTool: (tool: ToolMode) => void;
  setSnapLines: (lines: SnapLine[]) => void;
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
  setCornerRadii: (radii: StyleSettings['cornerRadii']) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  setElementWidth: (w: number) => void;
  setElementHeight: (h: number) => void;
}

export function useCanvasSetup({
  canvasElementRef, fabricCanvasRef, framesRef, historyRef,
  activeToolRef, spacePressedRef, drawingObjectRef, drawStartRef,
  activeFrameId, workspaceMode, isReadOnly, canvasReloadNonce, isProjectHydrating,
  addTextAt, createDrawableObject, saveCurrentFrame, persistFrameJson,
  setSelectedObject, setLayers, setCornerHandles, setResizeHandles,
  setActiveTool, setSnapLines,
  setFillLayers, setActiveFillLayerId, setFillColor, setFillOpacity,
  setStrokeColor, setStrokeWidth, setRotation,
  setFillMode, setGradientStops, setOpacity, setCornerRadii,
  setFontSize, setFontFamily, setTextAlign, setElementWidth, setElementHeight
}: Params) {
  useEffect(() => {
    if (workspaceMode === 'templates') return undefined;
    if (!canvasElementRef.current) return undefined;

    const frame = framesRef.current.find((item) => item.id === activeFrameId) ?? framesRef.current[0];
    const canvas = new Canvas(canvasElementRef.current, {
      width: frame.width,
      height: frame.height,
      backgroundColor: getFrameBackgroundFill(frame),
      preserveObjectStacking: true,
      selection: !isReadOnly
    });
    fabricCanvasRef.current = canvas;

    const sync = () => {
      const active = canvas.getActiveObject() as WebsterObject | undefined;
      setSelectedObject(active ?? null);
      setLayers(getLayers(canvas, active ?? null));
      setCornerHandles(active && isCornerEditable(active) ? getCornerHandles(active) : []);
      setResizeHandles(active ? getResizeHandles(active) : []);
      if (active) {
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
        const stroke = active.get('stroke');
        const strokeWidth = active.get('strokeWidth');
        const angle = active.get('angle');
        setStrokeColor(typeof stroke === 'string' ? stroke : '#000000');
        setStrokeWidth(typeof strokeWidth === 'number' ? strokeWidth : 0);
        setRotation(typeof angle === 'number' ? angle : 0);
        setFillMode(currentLayer.mode);
        setGradientStops(currentLayer.stops);
        setOpacity(typeof activeOpacity === 'number' ? activeOpacity : 1);
        setCornerRadii(getObjectCornerRadii(active));
        if (typeof nextFontSize === 'number') setFontSize(nextFontSize);
        if (typeof nextFontFamily === 'string') setFontFamily(nextFontFamily);
        if (typeof nextTextAlign === 'string') setTextAlign(nextTextAlign as 'left' | 'center' | 'right');
        const sizeTarget = active as WebsterObject & {
          getScaledWidth?: () => number;
          getScaledHeight?: () => number;
        };
        const scaledWidth = sizeTarget.getScaledWidth?.();
        const scaledHeight = sizeTarget.getScaledHeight?.();
        setElementWidth(Math.round(typeof scaledWidth === 'number' && Number.isFinite(scaledWidth) ? scaledWidth : active.getBoundingRect().width));
        setElementHeight(Math.round(typeof scaledHeight === 'number' && Number.isFinite(scaledHeight) ? scaledHeight : active.getBoundingRect().height));
      }
    };

    const applyDrawingMode = () => {
      const tool = activeToolRef.current;
      const isPencilMode = !isReadOnly && tool === 'pencil' && !spacePressedRef.current;
      canvas.isDrawingMode = isPencilMode;

      if (isPencilMode) {
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new PencilBrush(canvas);
        }

        const brush = canvas.freeDrawingBrush as PencilBrush;
        brush.width = 4;
        brush.color = '#1f2937';
      }
    };

    async function loadFrame() {
      if (frame.json) {
        try {
          await canvas.loadFromJSON(frame.json);
          ensureObjectIds(canvas);
        } catch {
          canvas.clear();
        }
      } else if (!isProjectHydrating) {
        addStarterObjects(canvas, frame);
      }
      if (isReadOnly) {
        canvas.selection = false;
        canvas.skipTargetFind = true;
        canvas.forEachObject((object) => {
          object.selectable = false;
          object.evented = false;
        });
      }
      setCanvasBackground(canvas, getFrameBackgroundFill(frame));
      sync();
      persistFrameJson(frame.id, toCanvasJson(canvas));
      historyRef.current[frame.id] = {
        branches: [{
          id: createId(),
          name: 'Main',
          createdAt: new Date().toISOString(),
          steps: [{ json: toCanvasJson(canvas), changedAt: new Date().toISOString() }]
        }],
        activeBranchId: '',
        activeIndex: 0
      };
      historyRef.current[frame.id].activeBranchId = historyRef.current[frame.id].branches[0].id;
      canvas.requestRenderAll();
    }

    canvas.on('selection:created', sync);
    canvas.on('selection:updated', sync);
    canvas.on('selection:cleared', sync);
    canvas.on('object:added', ({ target }) => {
      configureSelectionOutline(target as WebsterObject | undefined);
      if (!isReadOnly && !isProjectHydrating) {
        saveCurrentFrame(true);
      }
    });
    canvas.on('object:added', sync);
    canvas.on('object:removed', () => {
      sync();
      if (!isReadOnly && !isProjectHydrating) {
        saveCurrentFrame(true);
      }
    });
    canvas.on('mouse:down', (event) => {
      const pointerEvent = event.e as MouseEvent | undefined;
      const tool = activeToolRef.current;
      if (isReadOnly || !pointerEvent || tool === 'select' || tool === 'image' || spacePressedRef.current) return;
      if (tool === 'pencil') return;
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
      if (isReadOnly || !object || !pointerEvent) return;
      const pointer = getCanvasPointer(canvas, pointerEvent);
      if (!pointer) return;
      resizeDrawableObject(object, drawStartRef.current, pointer);
      canvas.requestRenderAll();
    });
    canvas.on('mouse:up', () => {
      const object = drawingObjectRef.current;
      if (isReadOnly || !object) return;
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
      if (isReadOnly) return;
      snapMovingObject(canvas, event.target as WebsterObject | undefined, setSnapLines);
      setCornerHandles([]);
      setResizeHandles([]);
    });
    canvas.on('object:modified', () => {
      if (isReadOnly) return;
      setSnapLines([]);
      sync();
      saveCurrentFrame(true);
    });
    canvas.on('path:created', ({ path }) => {
      if (isReadOnly) return;
      const createdPath = path as WebsterObject | undefined;
      if (!createdPath) {
        return;
      }

      createdPath.objectName = 'Pencil stroke';
      createdPath.objectId = createdPath.objectId ?? `stroke-${Date.now()}`;
      sync();
      saveCurrentFrame(true);
    });
    canvas.on('text:changed', () => {
      if (isReadOnly) return;
      sync();
      saveCurrentFrame(true);
    });
    canvas.on('selection:cleared', () => {
      setSnapLines([]);
      setCornerHandles([]);
      setResizeHandles([]);
    });

    void loadFrame();

    const drawingModeInterval = window.setInterval(applyDrawingMode, 80);
    applyDrawingMode();

    return () => {
      window.clearInterval(drawingModeInterval);
      fabricCanvasRef.current = null;
      void canvas.dispose();
    };
  }, [activeFrameId, canvasReloadNonce, isProjectHydrating, isReadOnly, workspaceMode]);
}
