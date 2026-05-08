import { useEffect, useRef } from 'react';
import { Canvas } from 'fabric';
import { EditorSidebar } from './sidebar/EditorSidebar';
import { EditorWorkspace } from './workspace/EditorWorkspace';
import { EditorProperties } from './properties/EditorProperties';
import { colorWithOpacity } from '../lib/color';
import {
  DesignFrame, FrameHistory, ToolMode, WebsterObject,
  cornerFields, createId, defaultProjectName, fontOptions,
  galleryTemplates, getTemplatePreviewClass, getTemplateToneClass,
  presets
} from '../lib/editorTypes';
import {
  createDefaultGradientStops, createGradientPreview,
  formatSavedProjectDate, getFrameStops, isCornerEditable
} from '../lib/editorHelpers';
import { useEditorState } from '../hooks/useEditorState';
import { useHistory } from '../hooks/useHistory';
import { useWorkspace } from '../hooks/useWorkspace';
import { useKeyboard } from '../hooks/useKeyboard';
import { useAuth } from '../hooks/useAuth';
import { useProjects } from '../hooks/useProjects';
import { useFrameActions } from '../hooks/useFrameActions';
import { useObjectActions } from '../hooks/useObjectActions';
import { useCanvasSetup } from '../hooks/useCanvasSetup';
import owlMascot from '../public/owl.png';
import { Textbox } from 'fabric';

const initialFrames: DesignFrame[] = presets.map((preset, index) => ({
  ...preset,
  id: createId(),
  name: index === 0 ? 'Instagram' : preset.name,
  backgroundColor: '#ffffff',
  backgroundOpacity: 1,
  backgroundMode: 'solid',
  backgroundStops: createDefaultGradientStops('#ffffff', '#d9d9d9')
}));

export function EditorApp() {
  // --- Refs (shared across hooks) ---
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
  const activeToolRef = useRef<ToolMode>('select');
  const spacePressedRef = useRef(false);
  const gridCursorTargetRef = useRef({ x: 0, y: 0 });
  const gridCursorCurrentRef = useRef({ x: 0, y: 0 });
  const gridCursorAnimationRef = useRef<number | null>(null);
  const styleSettingsRef = useRef({
    cornerRadii: { topLeft: 14, topRight: 14, bottomRight: 14, bottomLeft: 14 },
    fillColor: '#1f2937',
    fillOpacity: 1,
    fontFamily: 'Inter, Segoe UI, sans-serif',
    fontSize: 56
  });

  // --- All state ---
  const state = useEditorState(initialFrames);
  const {
    frames, setFrames,
    activeFrameId, setActiveFrameId,
    layers, setLayers,
    selectedObject, setSelectedObject,
    showGrid, setShowGrid,
    fillColor, setFillColor,
    fillOpacity, setFillOpacity,
    fillMode, setFillMode,
    opacity, setOpacity,
    fontSize, setFontSize,
    fontFamily, setFontFamily,
    cornerRadii, setCornerRadii,
    gradientStops, setGradientStops,
    fillLayers, setFillLayers,
    activeFillLayerId, setActiveFillLayerId,
    elementWidth, setElementWidth,
    elementHeight, setElementHeight,
    textAlign, setTextAlign,
    snapLines, setSnapLines,
    cornerHandles, setCornerHandles,
    resizeHandles, setResizeHandles,
    workspaceZoom, setWorkspaceZoom,
    workspacePan, setWorkspacePan,
    spacePressed, setSpacePressed,
    frameWidthInput, setFrameWidthInput,
    frameHeightInput, setFrameHeightInput,
    activeTool, setActiveTool,
    workspaceMode, setWorkspaceMode,
    sidebarPanel, setSidebarPanel,
    projectId, setProjectId,
    projectName, setProjectName,
    projectDescription, setProjectDescription,
    savedProjects, setSavedProjects,
    savedProjectsLoading, setSavedProjectsLoading,
    savedProjectsError, setSavedProjectsError,
    projectStatus, setProjectStatus,
    projectError, setProjectError,
    isSavingProject, setIsSavingProject,
    openingProjectId, setOpeningProjectId,
    deletingProjectId, setDeletingProjectId,
    authUser, setAuthUser,
    authMode, setAuthMode,
    authName, setAuthName,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authLoading, setAuthLoading,
    authChecking, setAuthChecking,
    authError, setAuthError,
    authStatus, setAuthStatus
  } = state;

  const activeFrame = frames.find((f) => f.id === activeFrameId) ?? frames[0];
  const zoomPercent = Math.round(workspaceZoom * 100);

  // --- Sync refs ---
  useEffect(() => { framesRef.current = frames; }, [frames]);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { spacePressedRef.current = spacePressed; }, [spacePressed]);
  useEffect(() => { setFrameWidthInput(String(activeFrame.width)); setFrameHeightInput(String(activeFrame.height)); },
    [activeFrame.id, activeFrame.width, activeFrame.height]);
  useEffect(() => {
    styleSettingsRef.current = { cornerRadii, fillColor, fillOpacity, fontFamily, fontSize };
  }, [cornerRadii, fillColor, fillOpacity, fontFamily, fontSize]);
  useEffect(() => {
    return () => { if (gridCursorAnimationRef.current !== null) window.cancelAnimationFrame(gridCursorAnimationRef.current); };
  }, []);

  // --- Domain hooks ---
  const history = useHistory({
    fabricCanvasRef, framesRef, historyRef, isRestoringRef, activeFrameId,
    setFrames, setSelectedObject, setLayers, setCornerHandles, setResizeHandles
  });

  const frameActions = useFrameActions({
    fabricCanvasRef, framesRef, activeFrameId, activeFrame, frames,
    frameWidthInput, frameHeightInput, workspacePan,
    setFrames, setActiveFrameId, setWorkspaceMode, setWorkspacePan,
    setWorkspaceZoom, setActiveTool, setSidebarPanel, setFrameWidthInput, setFrameHeightInput,
    saveCurrentFrame: history.saveCurrentFrame
  });

  const projects = useProjects({
    framesRef, historyRef, authUser,
    projectId, projectName, projectDescription,
    savedProjectsLoading, isSavingProject, openingProjectId, deletingProjectId, savedProjects,
    setFrames, setActiveFrameId, setSelectedObject, setLayers, setCornerHandles, setResizeHandles,
    setProjectId, setProjectName, setProjectDescription, setProjectError, setProjectStatus,
    setIsSavingProject, setOpeningProjectId, setDeletingProjectId,
    setSavedProjects, setSavedProjectsLoading, setSavedProjectsError,
    setAuthUser, setAuthError,
    saveCurrentFrame: history.saveCurrentFrame,
    openEditorWorkspace: frameActions.openEditorWorkspace
  });

  const auth = useAuth({
    authMode, authName, authEmail, authPassword, authLoading,
    setAuthUser, setAuthName, setAuthPassword, setAuthLoading, setAuthChecking,
    setAuthError, setAuthStatus,
    setSavedProjects, setProjectId, setSavedProjectsError, setProjectStatus, setProjectError,
    refreshSavedProjects: projects.refreshSavedProjects
  });

  const objectActions = useObjectActions({
    fabricCanvasRef, activeFrameRef, fileInputRef, styleSettingsRef,
    activeFrame, selectedObject, cornerRadii, fillColor, fillOpacity,
    fillMode, gradientStops, activeFillLayerId, fillLayers,
    setSelectedObject, setLayers, setCornerHandles, setResizeHandles, setCornerRadii,
    setFillLayers, setActiveFillLayerId, setFillColor, setFillOpacity, setFillMode,
    setGradientStops, setOpacity, setFontSize, setFontFamily,
    setElementWidth, setElementHeight, setTextAlign, setSnapLines,
    saveCurrentFrame: history.saveCurrentFrame
  });

  const workspace = useWorkspace({
    canvasStageRef, activeFrame, workspaceZoom, workspacePan, spacePressed,
    gridCursorTargetRef, gridCursorCurrentRef, gridCursorAnimationRef,
    isPanningRef, panStartRef, setWorkspaceZoom, setWorkspacePan
  });

  useCanvasSetup({
    canvasElementRef, fabricCanvasRef, framesRef, historyRef,
    activeToolRef, spacePressedRef, drawingObjectRef, drawStartRef,
    activeFrameId, workspaceMode,
    addTextAt: objectActions.addTextAt,
    createDrawableObject: objectActions.createDrawableObject,
    saveCurrentFrame: history.saveCurrentFrame,
    persistFrameJson: history.persistFrameJson,
    setSelectedObject, setLayers, setCornerHandles, setResizeHandles,
    setActiveTool, setSnapLines,
    setFillLayers, setActiveFillLayerId, setFillColor, setFillOpacity,
    setFillMode, setGradientStops, setOpacity, setCornerRadii,
    setFontSize, setFontFamily, setTextAlign, setElementWidth, setElementHeight
  });

  useKeyboard({
    activeFrameId, fileInputRef, isPanningRef,
    setSpacePressed, setActiveTool,
    removeSelected: objectActions.removeSelected,
    copySelected: objectActions.copySelected,
    pasteSelected: objectActions.pasteSelected,
    undoFrame: history.undoFrame,
    redoFrame: history.redoFrame
  });

  // Start session on mount
  useEffect(() => { void auth.bootstrapSession(); }, []);

  // --- Derived ---
  const activeName = selectedObject ? selectedObject.objectName ?? selectedObject.type ?? 'Object' : 'nothing selected';
  const isTextSelected = selectedObject instanceof Textbox || selectedObject?.type === 'textbox' || selectedObject?.type === 'text';
  const isShapeSelected = Boolean(selectedObject && selectedObject.type !== 'image' && !isTextSelected);
  const canEditCorners = Boolean(selectedObject && isCornerEditable(selectedObject));
  const activeFillLayer = fillLayers.find((layer) => layer.id === activeFillLayerId) ?? fillLayers[0];
  const isTemplatesMode = workspaceMode === 'templates';

  return (
    <main className={isTemplatesMode ? 'designer-shell templates-mode' : 'designer-shell'}>
      <EditorSidebar
        isTemplatesMode={isTemplatesMode}
        sidebarPanel={sidebarPanel}
        handleSidebarSelect={frameActions.handleSidebarSelect}
        addFrame={frameActions.addFrame}
        frames={frames}
        activeFrameId={activeFrameId}
        switchFrame={frameActions.switchFrame}
        getTemplateToneClass={getTemplateToneClass}
        getTemplatePreviewClass={getTemplatePreviewClass}
        presets={presets}
        deleteSelectedFrame={frameActions.deleteSelectedFrame}
        setWorkspaceMode={setWorkspaceMode}
        fileInputRef={fileInputRef}
        addRect={objectActions.addRect}
        addCircle={objectActions.addCircle}
        addTriangle={objectActions.addTriangle}
        addHeadingText={objectActions.addHeadingText}
        addSubheadingText={objectActions.addSubheadingText}
        addBodyText={objectActions.addBodyText}
        addText={objectActions.addText}
        updateFrameBackground={frameActions.updateFrameBackground}
        selectedObject={selectedObject}
        updateFill={objectActions.updateFill}
        fillColor={fillColor}
        updateOpacity={objectActions.updateOpacity}
        opacity={opacity}
        activeFrame={activeFrame}
        layers={layers}
        selectLayer={objectActions.selectLayer}
        toggleLayerVisibility={objectActions.toggleLayerVisibility}
        moveLayer={objectActions.moveLayer}
        authChecking={authChecking}
        authUser={authUser}
        logoutUser={auth.logoutUser}
        authMode={authMode}
        setAuthMode={setAuthMode}
        resetAuthMessages={auth.resetAuthMessages}
        authName={authName}
        setAuthName={setAuthName}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authLoading={authLoading}
        submitAuth={auth.submitAuth}
        authStatus={authStatus}
        authError={authError}
        canManageSavedProjects={projects.canManageSavedProjects}
        projectId={projectId}
        projectName={projectName}
        setProjectName={setProjectName}
        projectDescription={projectDescription}
        setProjectDescription={setProjectDescription}
        defaultProjectName={defaultProjectName}
        undoFrame={history.undoFrame}
        redoFrame={history.redoFrame}
        saveProjectToBackend={projects.saveProjectToBackend}
        isSavingProject={isSavingProject}
        projectRequestBusy={projects.projectRequestBusy}
        refreshSavedProjects={projects.refreshSavedProjects}
        savedProjectsLoading={savedProjectsLoading}
        exportProject={() => projects.exportProject(setProjectStatus, setProjectError)}
        importInputRef={importInputRef}
        importProject={projects.importProject}
        projectStatus={projectStatus}
        projectError={projectError}
        savedProjectsError={savedProjectsError}
        savedProjects={savedProjects}
        openSavedProject={projects.openSavedProject}
        openingProjectId={openingProjectId}
        deleteSavedProject={projects.deleteSavedProject}
        deletingProjectId={deletingProjectId}
        formatSavedProjectDate={formatSavedProjectDate}
        owlMascot={owlMascot}
      />

      <EditorWorkspace
        isTemplatesMode={isTemplatesMode}
        activeFrameName={activeFrame.name}
        activeFrameSizeLabel={`${activeFrame.width} x ${activeFrame.height}`}
        openEditorWorkspace={frameActions.openEditorWorkspace}
        setWorkspaceMode={setWorkspaceMode}
        workspaceZoom={workspaceZoom}
        setWorkspacePan={setWorkspacePan}
        setZoom={workspace.setZoom}
        zoomPercent={zoomPercent}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        exportFrame={() => objectActions.exportFrame(activeFrame)}
        galleryTemplates={galleryTemplates}
        createProjectFromTemplate={projects.createProjectFromTemplate}
        spacePressed={spacePressed}
        startWorkspacePan={workspace.startWorkspacePan}
        handleStagePointerEnter={workspace.handleStagePointerEnter}
        handleStagePointerLeave={workspace.handleStagePointerLeave}
        handleStagePointerMove={workspace.handleStagePointerMove}
        canvasStageRef={canvasStageRef}
        activeFrameRef={activeFrameRef}
        workspacePan={workspacePan}
        canvasElementRef={canvasElementRef}
        snapLines={snapLines}
        resizeHandles={resizeHandles}
        startResizeDrag={objectActions.startResizeDrag}
        cornerHandles={cornerHandles}
        startCornerRadiusDrag={objectActions.startCornerRadiusDrag}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        fileInputRef={fileInputRef}
      />

      <EditorProperties
        frameWidthInput={frameWidthInput}
        setFrameWidthInput={setFrameWidthInput}
        commitFrameWidth={frameActions.commitFrameWidth}
        frameHeightInput={frameHeightInput}
        setFrameHeightInput={setFrameHeightInput}
        commitFrameHeight={frameActions.commitFrameHeight}
        activeFrame={activeFrame}
        updateFrameBackgroundMode={frameActions.updateFrameBackgroundMode}
        updateFrameBackground={frameActions.updateFrameBackground}
        updateFrameBackgroundOpacity={frameActions.updateFrameBackgroundOpacity}
        getFrameStops={getFrameStops}
        updateFrameGradientStop={frameActions.updateFrameGradientStop}
        removeFrameGradientStop={frameActions.removeFrameGradientStop}
        addFrameGradientStop={frameActions.addFrameGradientStop}
        activeName={activeName}
        selectedObject={selectedObject}
        removeSelected={objectActions.removeSelected}
        opacity={opacity}
        updateOpacity={objectActions.updateOpacity}
        elementWidth={elementWidth}
        elementHeight={elementHeight}
        updateElementWidth={objectActions.updateElementWidth}
        updateElementHeight={objectActions.updateElementHeight}
        fillLayers={fillLayers}
        activeFillLayer={activeFillLayer}
        selectFillLayer={objectActions.selectFillLayer}
        colorWithOpacity={colorWithOpacity}
        createGradientPreview={createGradientPreview}
        addFillLayer={objectActions.addFillLayer}
        removeFillLayer={objectActions.removeFillLayer}
        fillMode={fillMode}
        applyFillMode={objectActions.applyFillMode}
        fillColor={fillColor}
        fillOpacity={fillOpacity}
        updateFill={objectActions.updateFill}
        updateFillOpacity={objectActions.updateFillOpacity}
        gradientStops={gradientStops}
        updateGradientStop={objectActions.updateGradientStop}
        removeGradientStop={objectActions.removeGradientStop}
        addGradientStop={objectActions.addGradientStop}
        canEditCorners={canEditCorners}
        cornerFields={cornerFields}
        cornerRadii={cornerRadii}
        updateCornerRadius={objectActions.updateCornerRadius}
        isTextSelected={isTextSelected}
        fontFamily={fontFamily}
        fontOptions={fontOptions}
        updateFontFamily={objectActions.updateFontFamily}
        fontSize={fontSize}
        updateFontSize={objectActions.updateFontSize}
        textAlign={textAlign}
        updateTextAlign={objectActions.updateTextAlign}
      />

      <input accept="image/*" hidden onChange={objectActions.handleImageUpload} ref={fileInputRef} type="file" />
    </main>
  );
}
