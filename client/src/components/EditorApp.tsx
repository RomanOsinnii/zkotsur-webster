import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from 'fabric';
import { changeCurrentUserPassword, updateCurrentUser } from '../api/auth';
import { EditorSidebar } from './sidebar/EditorSidebar';
import { EditorWorkspace } from './workspace/EditorWorkspace';
import { EditorProperties } from './properties/EditorProperties';
import { colorWithOpacity } from '../lib/color';
import { deleteTemplate, listTemplates, updateTemplate, type TemplateRecord, type UpdateTemplatePayload } from '../api/templates';
import {
  DesignFrame, FrameHistory, ToolMode, WebsterObject,
  cornerFields, createId, defaultProjectName, fontOptions,
  galleryTemplates, getTemplatePreviewClass, getTemplateToneClass,
  presets
} from '../lib/editorTypes';
import {
  createDefaultGradientStops, createGradientPreview,
  formatSavedProjectDate, getErrorMessage, getFrameStops, isCornerEditable
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
import { AuthPage } from './auth/AuthPage';
import { ProfilePage } from './profile/ProfilePage';
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

function deepClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneFrames(source: DesignFrame[]): DesignFrame[] {
  return source.map((frame) => ({
    ...frame,
    backgroundStops: frame.backgroundStops.map((stop) => ({ ...stop })),
    json: frame.json ? deepClone(frame.json) : undefined
  }));
}

function mapTemplateRecordToGallery(record: TemplateRecord, index: number) {
  const toneClass = `gallery-tone-${(index % 8) + 1}`;
  const normalizedCategory = record.category.trim().toLowerCase() || 'general';
  const subtitle = `${normalizedCategory.charAt(0).toUpperCase()}${normalizedCategory.slice(1)} template`;

  return {
    id: record.id,
    title: record.name,
    subtitle,
    category: normalizedCategory,
    width: record.width,
    height: record.height,
    size: `${record.width} x ${record.height}`,
    toneClass,
    illustrationClass: `ill-dynamic-${(index % 8) + 1}`,
    templateData: record.data ?? undefined
  };
}

type AuthReturnTarget = 'editor' | 'templates';

function parseAuthReturnTarget(): AuthReturnTarget | null {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const rawValue = params.get('returnTo')?.trim().toLowerCase();

  if (!rawValue) {
    return null;
  }

  if (rawValue === 'templates' || rawValue === '/templates') {
    return 'templates';
  }

  if (rawValue === 'editor' || rawValue === '/editor' || rawValue === 'home') {
    return 'editor';
  }

  return null;
}

function parseEmailVerificationToken(): string | null {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const token = params.get('verifyEmailToken')?.trim();
  return token || null;
}

function parsePasswordResetToken(): string | null {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const token = params.get('resetPasswordToken')?.trim();
  return token || null;
}

function removeQueryParamFromCurrentUrl(paramName: string): void {
  try {
    const url = new URL(globalThis.location.href);
    if (!url.searchParams.has(paramName)) {
      return;
    }
    url.searchParams.delete(paramName);
    const nextSearch = url.searchParams.toString();
    const nextPath = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
    globalThis.history.replaceState(null, '', nextPath);
  } catch {
    // Ignore URL parsing issues in non-browser environments.
  }
}

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
  const [templateCatalog, setTemplateCatalog] = useState(galleryTemplates);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState('');
  const [activeTemplateCategory, setActiveTemplateCategory] = useState('all');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [debouncedTemplateSearchQuery, setDebouncedTemplateSearchQuery] = useState('');
  const [templateSort, setTemplateSort] = useState<'recommended' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc'>('recommended');
  const [authScreenVisible, setAuthScreenVisible] = useState(true);
  const authReturnTargetRef = useRef<AuthReturnTarget | null>(parseAuthReturnTarget());
  const emailVerificationTokenRef = useRef<string | null>(parseEmailVerificationToken());
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(parsePasswordResetToken());
  const [updatingTemplateId, setUpdatingTemplateId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const templateCreationSnapshotRef = useRef<{
    frames: DesignFrame[];
    projectId: string | null;
    projectName: string;
    projectDescription: string;
  } | null>(null);

  const templateCategories = useMemo(() => {
    const categories = Array.from(new Set(templateCatalog.map((item) => item.category))).filter(Boolean);
    categories.sort((a, b) => a.localeCompare(b));
    return ['all', ...categories];
  }, [templateCatalog]);

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = debouncedTemplateSearchQuery.trim().toLowerCase();

    const filtered = templateCatalog.filter((item) => {
      const matchesCategory = activeTemplateCategory === 'all' || item.category === activeTemplateCategory;
      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${item.title} ${item.subtitle} ${item.category}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    if (templateSort === 'recommended') {
      return filtered;
    }

    const sorted = [...filtered];

    if (templateSort === 'name-asc') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (templateSort === 'name-desc') {
      sorted.sort((a, b) => b.title.localeCompare(a.title));
    } else if (templateSort === 'size-asc') {
      sorted.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    } else if (templateSort === 'size-desc') {
      sorted.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    }

    return sorted;
  }, [activeTemplateCategory, debouncedTemplateSearchQuery, templateCatalog, templateSort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTemplateSearchQuery(templateSearchQuery);
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [templateSearchQuery]);

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
    setAuthError, setAuthStatus, setAuthEmail,
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
    nudgeSelected: objectActions.nudgeSelected,
    undoFrame: history.undoFrame,
    redoFrame: history.redoFrame
  });

  const shareCurrentProject = useCallback((target: 'x' | 'facebook' | 'linkedin') => {
    const projectLabel = projectName.trim() || 'Webster design';
    const text = encodeURIComponent(`Check out my design project: ${projectLabel}`);
    const url = encodeURIComponent(globalThis.location.href);

    const targetUrl = target === 'x'
      ? `https://twitter.com/intent/tweet?text=${text}&url=${url}`
      : target === 'facebook'
        ? `https://www.facebook.com/sharer/sharer.php?u=${url}`
        : `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;

    globalThis.open(targetUrl, '_blank', 'noopener,noreferrer');
  }, [projectName]);

  // Start session on mount
  useEffect(() => { void auth.bootstrapSession(); }, []);

  useEffect(() => {
    const token = emailVerificationTokenRef.current;
    if (!token) {
      return;
    }
    emailVerificationTokenRef.current = null;

    let cancelled = false;

    const applyVerificationToken = async () => {
      const ok = await auth.applyEmailVerificationToken(token);
      if (cancelled) {
        return;
      }

      setAuthMode('login');
      setAuthScreenVisible(true);
      removeQueryParamFromCurrentUrl('verifyEmailToken');

      if (!ok) {
        // Token was consumed from URL; user can request a new one by registering again.
      }
    };

    void applyVerificationToken();

    return () => {
      cancelled = true;
    };
  }, [auth, setAuthMode]);

  useEffect(() => {
    if (!passwordResetToken) {
      return;
    }

    setAuthMode('login');
    setAuthScreenVisible(true);
  }, [passwordResetToken, setAuthMode]);

  const applyAuthReturnTarget = useCallback(() => {
    const returnTarget = authReturnTargetRef.current;
    if (!returnTarget) {
      return;
    }

    setWorkspaceMode(returnTarget);
    try {
      const url = new URL(globalThis.location.href);
      if (url.searchParams.has('returnTo')) {
        url.searchParams.delete('returnTo');
        const nextSearch = url.searchParams.toString();
        const nextPath = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
        globalThis.history.replaceState(null, '', nextPath);
      }
    } catch {
      // Ignore URL parsing issues in non-browser environments.
    }
    authReturnTargetRef.current = null;
  }, [setWorkspaceMode]);

  useEffect(() => {
    if (authUser) {
      setAuthScreenVisible(false);
      applyAuthReturnTarget();
    }
  }, [applyAuthReturnTarget, authUser]);

  const refreshTemplates = useCallback(async (fallbackToStarterTemplates = true) => {
    setTemplatesLoading(true);
    setTemplatesError('');

    try {
      const templates = await listTemplates();
      if (!templates.length) {
        if (fallbackToStarterTemplates) {
          setTemplateCatalog(galleryTemplates);
          setTemplatesError('Server returned no templates. Showing starter templates.');
        } else {
          setTemplateCatalog([]);
        }
        return;
      }

      setTemplateCatalog(templates.map(mapTemplateRecordToGallery));
    } catch (error) {
      if (fallbackToStarterTemplates) {
        setTemplateCatalog(galleryTemplates);
      }
      setTemplatesError(getErrorMessage(error, fallbackToStarterTemplates
        ? 'Could not load templates from server. Showing starter templates.'
        : 'Could not refresh templates from server.'));
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // Load templates from backend with a safe local fallback.
  useEffect(() => {
    void refreshTemplates(true);
  }, [refreshTemplates]);

  useEffect(() => {
    if (activeTemplateCategory !== 'all' && !templateCategories.includes(activeTemplateCategory)) {
      setActiveTemplateCategory('all');
    }
  }, [activeTemplateCategory, templateCategories]);

  // --- Derived ---
  const activeName = selectedObject ? selectedObject.objectName ?? selectedObject.type ?? 'Object' : 'nothing selected';
  const isTextSelected = selectedObject instanceof Textbox || selectedObject?.type === 'textbox' || selectedObject?.type === 'text';
  const isShapeSelected = Boolean(selectedObject && selectedObject.type !== 'image' && !isTextSelected);
  const canEditCorners = Boolean(selectedObject && isCornerEditable(selectedObject));
  const activeFillLayer = fillLayers.find((layer) => layer.id === activeFillLayerId) ?? fillLayers[0];
  const isTemplatesMode = workspaceMode === 'templates';
  const isProfileView = !isTemplatesMode && sidebarPanel === 'account';

  const createProjectFromTemplateWithSnapshot = (template: typeof galleryTemplates[number]) => {
    templateCreationSnapshotRef.current = {
      frames: cloneFrames(framesRef.current),
      projectId,
      projectName,
      projectDescription
    };

    projects.createProjectFromTemplate(template);
  };

  const undoTemplateProjectCreation = () => {
    const snapshot = templateCreationSnapshotRef.current;
    if (!snapshot) {
      return false;
    }

    projects.applyProjectFrames(snapshot.frames, {
      projectId: snapshot.projectId,
      name: snapshot.projectName,
      description: snapshot.projectDescription
    });
    templateCreationSnapshotRef.current = null;
    return true;
  };

  const updateTemplateFromGallery = async (id: string, payload: UpdateTemplatePayload) => {
    setUpdatingTemplateId(id);
    setTemplatesError('');
    try {
      await updateTemplate(id, payload);
      await refreshTemplates(false);
    } catch (error) {
      setTemplatesError(getErrorMessage(error, 'Could not update template.'));
    } finally {
      setUpdatingTemplateId(null);
    }
  };

  const deleteTemplateFromGallery = async (id: string) => {
    setDeletingTemplateId(id);
    setTemplatesError('');
    try {
      await deleteTemplate(id);
      await refreshTemplates(false);
    } catch (error) {
      setTemplatesError(getErrorMessage(error, 'Could not delete template.'));
    } finally {
      setDeletingTemplateId(null);
    }
  };

  if (authChecking) {
    return (
      <main className="auth-page" aria-label="Authentication loading">
        <section className="auth-card auth-card-loading">
          <h1>Checking your session...</h1>
        </section>
      </main>
    );
  }

  if (authScreenVisible && !authUser) {
    return (
      <AuthPage
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
        authChecking={authChecking}
        authStatus={authStatus}
        authError={authError}
        submitAuth={auth.submitAuth}
        resendEmailVerification={auth.resendEmailVerification}
        requestPasswordReset={auth.startPasswordReset}
        passwordResetToken={passwordResetToken}
        submitPasswordReset={async (newPassword) => {
          if (!passwordResetToken) {
            return false;
          }

          const ok = await auth.submitPasswordReset(passwordResetToken, newPassword);
          if (!ok) {
            return false;
          }

          setPasswordResetToken(null);
          removeQueryParamFromCurrentUrl('resetPasswordToken');
          return true;
        }}
        continueAsGuest={() => {
          auth.resetAuthMessages();
          setAuthScreenVisible(false);
        }}
      />
    );
  }

  return (
    <main className={isTemplatesMode ? 'designer-shell templates-mode' : isProfileView ? 'designer-shell profile-mode' : 'designer-shell'}>
      <EditorSidebar
        isTemplatesMode={isTemplatesMode}
        isProfileView={isProfileView}
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
        addArrow={objectActions.addArrow}
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
        authUser={authUser}
        logoutUser={() => {
          auth.logoutUser();
          setAuthScreenVisible(true);
        }}
        openAuthPage={() => {
          auth.resetAuthMessages();
          setAuthScreenVisible(true);
        }}
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
        exportProjectFromBackend={(format) => projects.exportProjectFromBackend(format, setProjectStatus, setProjectError)}
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

      {isProfileView ? (
        <ProfilePage
          authUser={authUser}
          savedProjects={savedProjects}
          projectId={projectId}
          projectRequestBusy={projects.projectRequestBusy}
          savedProjectsLoading={savedProjectsLoading}
          openingProjectId={openingProjectId}
          deletingProjectId={deletingProjectId}
          openSavedProject={projects.openSavedProject}
          deleteSavedProject={projects.deleteSavedProject}
          refreshSavedProjects={() => projects.refreshSavedProjects()}
          openAuthPage={() => {
            auth.resetAuthMessages();
            setAuthScreenVisible(true);
          }}
          logoutUser={() => {
            auth.logoutUser();
            setAuthScreenVisible(true);
          }}
          openEditorWorkspace={() => {
            frameActions.handleSidebarSelect('templates');
            frameActions.openEditorWorkspace();
          }}
          saveProfileName={async (name) => {
            try {
              const updatedUser = await updateCurrentUser({ name });
              setAuthUser(updatedUser);
              setAuthStatus('Profile updated.');
              setAuthError('');
              return true;
            } catch (error) {
              setAuthError(getErrorMessage(error, 'Could not update profile.'));
              return false;
            }
          }}
          saveProfileAvatar={async (avatarUrl) => {
            try {
              const updatedUser = await updateCurrentUser({ avatarUrl });
              setAuthUser(updatedUser);
              setAuthStatus(avatarUrl ? 'Avatar updated.' : 'Avatar removed.');
              setAuthError('');
              return true;
            } catch (error) {
              setAuthError(getErrorMessage(error, 'Could not update avatar.'));
              return false;
            }
          }}
          changePassword={async (currentPassword, newPassword) => {
            try {
              await changeCurrentUserPassword({ currentPassword, newPassword });
              setAuthStatus('Password updated.');
              setAuthError('');
              return true;
            } catch (error) {
              setAuthError(getErrorMessage(error, 'Could not update password.'));
              return false;
            }
          }}
          formatSavedProjectDate={formatSavedProjectDate}
          projectStatus={projectStatus}
          projectError={projectError}
          savedProjectsError={savedProjectsError}
        />
      ) : (
      <EditorWorkspace
        isTemplatesMode={isTemplatesMode}
        activeFrameName={activeFrame.name}
        activeFrameSizeLabel={`${activeFrame.width} x ${activeFrame.height}`}
        projectName={projectName}
        setProjectName={setProjectName}
        projectId={projectId}
        projectStatus={projectStatus}
        projectError={projectError}
        projectRequestBusy={projects.projectRequestBusy}
        openEditorWorkspace={frameActions.openEditorWorkspace}
        openProjectsWorkspace={() => {
          frameActions.openEditorWorkspace();
          frameActions.handleSidebarSelect('account');
        }}
        isProjectsView={!isTemplatesMode && sidebarPanel === 'account'}
        setWorkspaceMode={setWorkspaceMode}
        workspaceZoom={workspaceZoom}
        setWorkspacePan={setWorkspacePan}
        setZoom={workspace.setZoom}
        zoomPercent={zoomPercent}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        exportFrame={(format) => { void objectActions.exportFrame(activeFrame, format); }}
        createTemplateFromCurrentProject={() => {
          void projects.createTemplateFromCurrentProject(setProjectStatus, setProjectError)
            .then(() => refreshTemplates(false));
        }}
        shareCurrentProject={shareCurrentProject}
        galleryTemplates={visibleTemplates}
        templateCatalogCount={templateCatalog.length}
        templateCategories={templateCategories}
        activeTemplateCategory={activeTemplateCategory}
        setActiveTemplateCategory={setActiveTemplateCategory}
        templateSearchQuery={templateSearchQuery}
        setTemplateSearchQuery={setTemplateSearchQuery}
        templateSort={templateSort}
        setTemplateSort={setTemplateSort}
        templatesLoading={templatesLoading}
        templatesError={templatesError}
        canManageTemplates={Boolean(authUser)}
        updatingTemplateId={updatingTemplateId}
        deletingTemplateId={deletingTemplateId}
        updateTemplateItem={updateTemplateFromGallery}
        deleteTemplateItem={deleteTemplateFromGallery}
        createProjectFromTemplate={createProjectFromTemplateWithSnapshot}
        undoTemplateProjectCreation={undoTemplateProjectCreation}
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
      )}

      {isProfileView ? null : <EditorProperties
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
      />}

      <input accept="image/*" hidden onChange={objectActions.handleImageUpload} ref={fileInputRef} type="file" />
    </main>
  );
}
