import { Dispatch, MutableRefObject, PointerEvent as ReactPointerEvent, SetStateAction, useEffect } from 'react';
import { DesignFrame } from '../lib/editorTypes';
import { clampZoom } from '../lib/editorHelpers';

interface Params {
  canvasStageRef: MutableRefObject<HTMLDivElement | null>;
  activeFrame: DesignFrame;
  workspaceMode: 'templates' | 'editor';
  workspaceZoom: number;
  workspacePan: { x: number; y: number };
  spacePressed: boolean;
  gridCursorTargetRef: MutableRefObject<{ x: number; y: number }>;
  gridCursorCurrentRef: MutableRefObject<{ x: number; y: number }>;
  gridCursorAnimationRef: MutableRefObject<number | null>;
  isPanningRef: MutableRefObject<boolean>;
  panStartRef: MutableRefObject<{ x: number; y: number; panX: number; panY: number }>;
  setWorkspaceZoom: Dispatch<SetStateAction<number>>;
  setWorkspacePan: Dispatch<SetStateAction<{ x: number; y: number }>>;
}

export function useWorkspace({
  canvasStageRef, activeFrame, workspaceMode, workspaceZoom, workspacePan, spacePressed,
  gridCursorTargetRef, gridCursorCurrentRef, gridCursorAnimationRef,
  isPanningRef, panStartRef,
  setWorkspaceZoom, setWorkspacePan
}: Params) {
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

  useEffect(() => {
    const stage = canvasStageRef.current;
    if (!stage) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const multiplier = event.deltaY > 0 ? 0.9 : 1.1;
      setZoom(workspaceZoom * multiplier, { x: event.clientX, y: event.clientY });
    };
    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [workspaceMode, workspaceZoom, activeFrame.width, activeFrame.height]);

  const updateGridCursorTarget = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = canvasStageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    gridCursorTargetRef.current = {
      x: Math.min(rect.width, Math.max(0, event.clientX - rect.left)),
      y: Math.min(rect.height, Math.max(0, event.clientY - rect.top))
    };
  };

  const animateGridCursor = () => {
    const stage = canvasStageRef.current;
    if (!stage) { gridCursorAnimationRef.current = null; return; }
    const target = gridCursorTargetRef.current;
    const current = gridCursorCurrentRef.current;
    const nextX = current.x + (target.x - current.x) * 0.24;
    const nextY = current.y + (target.y - current.y) * 0.24;
    gridCursorCurrentRef.current = { x: nextX, y: nextY };
    stage.style.setProperty('--grid-cursor-x', `${nextX.toFixed(1)}px`);
    stage.style.setProperty('--grid-cursor-y', `${nextY.toFixed(1)}px`);
    if (Math.abs(target.x - nextX) < 0.25 && Math.abs(target.y - nextY) < 0.25) {
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
    canvasStageRef.current?.style.setProperty('--grid-focus-opacity', '0');
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

  return { setZoom, handleStagePointerMove, handleStagePointerEnter, handleStagePointerLeave, startWorkspacePan };
}
