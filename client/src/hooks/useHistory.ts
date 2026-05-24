import { MutableRefObject } from 'react';
import { Canvas } from 'fabric';
import { CornerHandle, DesignFrame, FrameHistory, LayerItem, ResizeHandle, WebsterObject, createId, maxHistoryBranches, maxHistorySteps } from '../lib/editorTypes';
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
    const historyStep = { json, changedAt: new Date().toISOString() };
    const current = historyRef.current[frameId] ?? {
      branches: [{
        id: createId(),
        name: 'Main',
        createdAt: new Date().toISOString(),
        steps: []
      }],
      activeBranchId: '',
      activeIndex: -1
    };
    if (!current.activeBranchId) {
      current.activeBranchId = current.branches[0].id;
    }

    const branchIndex = current.branches.findIndex((branch) => branch.id === current.activeBranchId);
    const activeBranch = current.branches[Math.max(0, branchIndex)];
    if (current.activeIndex < activeBranch.steps.length - 1) {
      const branchId = createId();
      const branched = {
        id: branchId,
        name: `Branch ${current.branches.length + 1}`,
        createdAt: new Date().toISOString(),
        steps: [...activeBranch.steps.slice(0, current.activeIndex + 1), historyStep].slice(-maxHistorySteps)
      };
      const nextBranches = [...current.branches, branched];
      while (nextBranches.length > maxHistoryBranches) {
        const removableIndex = nextBranches.findIndex((branch) => branch.id !== branchId);
        if (removableIndex < 0) break;
        nextBranches.splice(removableIndex, 1);
      }
      historyRef.current[frameId] = {
        branches: nextBranches,
        activeBranchId: branchId,
        activeIndex: branched.steps.length - 1
      };
      return;
    }

    const nextSteps = [...activeBranch.steps, historyStep].slice(-maxHistorySteps);
    const nextActiveIndex = nextSteps.length - 1;
    historyRef.current[frameId] = {
      ...current,
      branches: current.branches.map((branch) => branch.id === activeBranch.id ? { ...branch, steps: nextSteps } : branch),
      activeIndex: nextActiveIndex
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
    if (!history || history.activeIndex <= 0) return;
    const branch = history.branches.find((item) => item.id === history.activeBranchId);
    if (!branch) return;
    const previous = branch.steps[history.activeIndex - 1]?.json;
    if (!previous) return;
    historyRef.current[activeFrameId] = { ...history, activeIndex: history.activeIndex - 1 };
    void restoreFrameJson(previous);
  };

  const redoFrame = () => {
    const history = historyRef.current[activeFrameId];
    if (!history) return;
    const branch = history.branches.find((item) => item.id === history.activeBranchId);
    if (!branch || history.activeIndex >= branch.steps.length - 1) return;
    const next = branch.steps[history.activeIndex + 1]?.json;
    if (!next) return;
    historyRef.current[activeFrameId] = { ...history, activeIndex: history.activeIndex + 1 };
    void restoreFrameJson(next);
  };

  const listBranches = () => {
    const history = historyRef.current[activeFrameId];
    if (!history) return [];
    return history.branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      steps: branch.steps.length,
      isActive: branch.id === history.activeBranchId
    }));
  };

  const switchBranch = (branchId: string) => {
    const history = historyRef.current[activeFrameId];
    if (!history) return;
    const branch = history.branches.find((item) => item.id === branchId);
    if (!branch || branch.steps.length === 0) return;
    historyRef.current[activeFrameId] = {
      ...history,
      activeBranchId: branchId,
      activeIndex: branch.steps.length - 1
    };
    void restoreFrameJson(branch.steps[branch.steps.length - 1].json);
  };

  const listActiveBranchSteps = () => {
    const history = historyRef.current[activeFrameId];
    if (!history) return [];
    const branch = history.branches.find((item) => item.id === history.activeBranchId);
    if (!branch) return [];
    return branch.steps.map((step, index) => ({
      index,
      label: `Step ${index + 1}`,
      changedAt: step.changedAt,
      isActive: index === history.activeIndex
    }));
  };

  const restoreHistoryStep = (stepIndex: number) => {
    const history = historyRef.current[activeFrameId];
    if (!history) return;
    const branch = history.branches.find((item) => item.id === history.activeBranchId);
    if (!branch) return;
    const target = branch.steps[stepIndex]?.json;
    if (!target) return;
    historyRef.current[activeFrameId] = { ...history, activeIndex: stepIndex };
    void restoreFrameJson(target);
  };

  return {
    persistFrameJson, pushHistory, saveCurrentFrame, restoreFrameJson,
    undoFrame, redoFrame, listBranches, switchBranch, listActiveBranchSteps, restoreHistoryStep
  };
}
