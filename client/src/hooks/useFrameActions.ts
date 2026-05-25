import { MutableRefObject } from 'react';
import { Canvas } from 'fabric';
import {
  CornerRadii, DesignFrame, FillMode, FramePreset, GradientStopItem, SidebarPanel, ToolMode, WebsterObject, createId
} from '../lib/editorTypes';
import {
  clampFrameSize, clampOpacity, createDefaultGradientStops,
  getFrameBackgroundFill, getFrameStops, setCanvasBackground, setCanvasSize
} from '../lib/editorHelpers';

interface Params {
  fabricCanvasRef: MutableRefObject<Canvas | null>;
  framesRef: MutableRefObject<DesignFrame[]>;
  activeFrameId: string;
  activeFrame: DesignFrame;
  frames: DesignFrame[];
  frameWidthInput: string;
  frameHeightInput: string;
  workspacePan: { x: number; y: number };
  setFrames: (frames: DesignFrame[]) => void;
  setActiveFrameId: (id: string) => void;
  setWorkspaceMode: (mode: 'templates' | 'editor') => void;
  setWorkspacePan: (pan: { x: number; y: number }) => void;
  setWorkspaceZoom: (zoom: number) => void;
  setActiveTool: (tool: ToolMode) => void;
  setSidebarPanel: (panel: SidebarPanel) => void;
  setFrameWidthInput: (v: string) => void;
  setFrameHeightInput: (v: string) => void;
  saveCurrentFrame: (recordHistory?: boolean) => void;
}

export function useFrameActions({
  fabricCanvasRef, framesRef,
  activeFrameId, activeFrame, frames, frameWidthInput, frameHeightInput,
  setFrames, setActiveFrameId, setWorkspaceMode, setWorkspacePan, setWorkspaceZoom,
  setActiveTool, setSidebarPanel,
  setFrameWidthInput, setFrameHeightInput,
  saveCurrentFrame
}: Params) {
  const resetWorkspace = () => {
    setWorkspacePan({ x: 0, y: 0 });
    setWorkspaceZoom(0.62);
    setActiveTool('select');
  };

  const openEditorWorkspace = () => {
    setWorkspaceMode('editor');
    resetWorkspace();
  };

  const updateActiveFrame = (
    patch: Partial<Pick<DesignFrame, 'width' | 'height' | 'backgroundColor' | 'backgroundOpacity' | 'backgroundMode' | 'backgroundStops'>>
  ) => {
    const nextFrames = framesRef.current.map((frame) =>
      frame.id === activeFrameId ? { ...frame, ...patch } : frame
    );
    framesRef.current = nextFrames;
    setFrames(nextFrames);
  };

  const switchFrame = (frameId: string) => {
    saveCurrentFrame();
    setActiveFrameId(frameId);
    resetWorkspace();
  };

  const addFrame = (preset: FramePreset = { name: 'Frame', description: 'Custom frame', width: 1080, height: 1080 }) => {
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
    openEditorWorkspace();
  };

  const deleteSelectedFrame = () => {
    if (frames.length <= 1) return;
    const nextFrames = frames.filter((frame) => frame.id !== activeFrameId);
    framesRef.current = nextFrames;
    setFrames(nextFrames);
    setActiveFrameId(nextFrames[0].id);
    resetWorkspace();
  };

  const handleSidebarSelect = (panel: SidebarPanel) => {
    setSidebarPanel(panel);
    if (panel !== 'templates') openEditorWorkspace();
  };

  const updateFrameWidth = (value: number) => {
    const width = clampFrameSize(value);
    const canvas = fabricCanvasRef.current;
    if (canvas) { setCanvasSize(canvas, width, activeFrame.height); saveCurrentFrame(true); }
    updateActiveFrame({ width });
  };

  const updateFrameHeight = (value: number) => {
    const height = clampFrameSize(value);
    const canvas = fabricCanvasRef.current;
    if (canvas) { setCanvasSize(canvas, activeFrame.width, height); saveCurrentFrame(true); }
    updateActiveFrame({ height });
  };

  const updateFrameBackground = (color: string) => {
    const sourceFrame = framesRef.current.find((frame) => frame.id === activeFrameId) ?? activeFrame;
    const nextFrame = { ...sourceFrame, backgroundColor: color };
    const canvas = fabricCanvasRef.current;
    if (canvas) { setCanvasBackground(canvas, getFrameBackgroundFill(nextFrame)); saveCurrentFrame(true); }
    updateActiveFrame({ backgroundColor: color });
  };

  const updateFrameBackgroundOpacity = (opacityValue: number) => {
    const nextOpacity = clampOpacity(opacityValue);
    const sourceFrame = framesRef.current.find((frame) => frame.id === activeFrameId) ?? activeFrame;
    const nextFrame = { ...sourceFrame, backgroundOpacity: nextOpacity };
    const canvas = fabricCanvasRef.current;
    if (canvas) { setCanvasBackground(canvas, getFrameBackgroundFill(nextFrame)); saveCurrentFrame(true); }
    updateActiveFrame({ backgroundOpacity: nextOpacity });
  };

  const updateFrameBackgroundMode = (mode: FillMode) => {
    const sourceFrame = framesRef.current.find((frame) => frame.id === activeFrameId) ?? activeFrame;
    const nextFrame = { ...sourceFrame, backgroundMode: mode };
    const canvas = fabricCanvasRef.current;
    if (canvas) { setCanvasBackground(canvas, getFrameBackgroundFill(nextFrame)); saveCurrentFrame(true); }
    updateActiveFrame({ backgroundMode: mode });
  };

  const updateFrameGradientStop = (
    id: string,
    patch: Partial<Pick<GradientStopItem, 'offset' | 'color' | 'opacity'>>
  ) => {
    const sourceFrame = framesRef.current.find((frame) => frame.id === activeFrameId) ?? activeFrame;
    const nextStops = getFrameStops(sourceFrame)
      .map((stop) => (stop.id === id ? { ...stop, ...patch } : stop))
      .sort((a, b) => a.offset - b.offset);
    const nextFrame = { ...sourceFrame, backgroundStops: nextStops };
    const canvas = fabricCanvasRef.current;
    if (canvas) { setCanvasBackground(canvas, getFrameBackgroundFill(nextFrame)); saveCurrentFrame(true); }
    updateActiveFrame({ backgroundStops: nextStops });
  };

  const addFrameGradientStop = () => {
    const sourceFrame = framesRef.current.find((frame) => frame.id === activeFrameId) ?? activeFrame;
    const nextStops = [...getFrameStops(sourceFrame), { id: createId(), offset: 0.5, color: '#737373', opacity: 1 }]
      .sort((a, b) => a.offset - b.offset);
    updateActiveFrame({ backgroundStops: nextStops });
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      setCanvasBackground(canvas, getFrameBackgroundFill({ ...sourceFrame, backgroundStops: nextStops }));
      saveCurrentFrame(true);
    }
  };

  const removeFrameGradientStop = (id: string) => {
    const sourceFrame = framesRef.current.find((frame) => frame.id === activeFrameId) ?? activeFrame;
    const currentStops = getFrameStops(sourceFrame);
    if (currentStops.length <= 2) return;
    const nextStops = currentStops.filter((stop) => stop.id !== id);
    updateActiveFrame({ backgroundStops: nextStops });
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      setCanvasBackground(canvas, getFrameBackgroundFill({ ...sourceFrame, backgroundStops: nextStops }));
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

  return {
    openEditorWorkspace, handleSidebarSelect,
    switchFrame, addFrame, deleteSelectedFrame,
    updateActiveFrame,
    updateFrameWidth, updateFrameHeight, commitFrameWidth, commitFrameHeight,
    updateFrameBackground, updateFrameBackgroundOpacity, updateFrameBackgroundMode,
    updateFrameGradientStop, addFrameGradientStop, removeFrameGradientStop
  };
}
