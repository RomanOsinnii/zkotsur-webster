import { MutableRefObject } from 'react';
import { Canvas } from 'fabric';
import { CornerHandle, DesignFrame, FrameHistory, LayerItem, ResizeHandle, WebsterObject, maxHistorySteps } from '../lib/editorTypes';
import { ensureObjectIds, getLayers, toCanvasJson } from '../lib/editorHelpers';

interface Params {
  fabricCanvasRef: MutableRefObject<Canvas | null>;
  framesRef: MutableRefObject<DesignFrame[]>;
  historyRef: MutableRefObject<Record<string, FrameHistory>>;
  isRestoringRef: MutableRefObject<boolean>;
  activeFrameId: string;
  setFrames: (frames: DesignFrame[]) => void;
  setSelectedObject: (obj: WebsterObject | null) => void;
  setLayers: (layers: LayerItem[]) => void;
  setCornerHandles: (handles: CornerHandle[]) => void;
  setResizeHandles: (handles: ResizeHandle[]) => void;
}

export function useHistory({
  fabricCanvasRef, framesRef, historyRef, isRestoringRef,
  activeFrameId, setFrames, setSelectedObject, setLayers,
  setCornerHandles, setResizeHandles
}: Params) {
  const persistFrameJson = (frameId: string, json: Record<string, unknown>) => {
    const nextFrames = framesRef.current.map((frame) =>
      frame.id === frameId ? { ...frame, json } : frame
    );
    framesRef.current = nextFrames;
    setFrames(nextFrames);
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

  const saveCurrentFrame = (recordHistory = false) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const json = toCanvasJson(canvas);
    persistFrameJson(activeFrameId, json);
    if (!recordHistory || isRestoringRef.current) return;
    pushHistory(activeFrameId, json);
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

  return { persistFrameJson, pushHistory, saveCurrentFrame, restoreFrameJson, undoFrame, redoFrame };
}
