import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from 'fabric';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { changeCurrentUserPassword, updateCurrentUser } from '../api/auth';
import { enableGuestMode, getAccessToken, isGuestModeEnabled } from '../api/http';
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
  createDefaultGradientStops, createEditorProjectSnapshot, createGradientPreview,
  formatSavedProjectDate, getErrorMessage, getFrameStops, isCornerEditable, parseEditorProjectData
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
import { ThemeMode } from '../lib/theme';

type Props = {
  theme: ThemeMode;
  toggleTheme: () => void;
};

type SocialPlatform = 'linkedin' | 'facebook' | 'x';

function createInitialFrames(): DesignFrame[] {
  return presets.map((preset, index) => ({
    ...preset,
    id: createId(),
    name: index === 0 ? 'Instagram' : preset.name,
    backgroundColor: '#ffffff',
    backgroundOpacity: 1,
    backgroundMode: 'solid',
    backgroundStops: createDefaultGradientStops('#ffffff', '#d9d9d9')
  }));
}

const initialFrames: DesignFrame[] = createInitialFrames();

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

function createProjectSignature(
  frames: DesignFrame[],
  projectName: string,
  projectDescription: string
) {
  return JSON.stringify({
    name: projectName.trim(),
    description: projectDescription.trim(),
    data: createEditorProjectSnapshot(frames)
  });
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

function buildProjectShareUrl(shareSlug: string) {
  return `${globalThis.location.origin}/shared/${shareSlug}`;
}

function buildSocialShareUrl(platform: SocialPlatform, projectUrl: string, projectName: string) {
  const encodedUrl = encodeURIComponent(projectUrl);
  const encodedText = encodeURIComponent(`Check out "${projectName.trim() || 'this Webster design'}"`);

  if (platform === 'linkedin') {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  }

  if (platform === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }

  return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
}

function openSocialSharePopup(url: string) {
  const popupWidth = 720;
  const popupHeight = 640;
  const left = Math.max(0, Math.round((globalThis.screen.width - popupWidth) / 2));
  const top = Math.max(0, Math.round((globalThis.screen.height - popupHeight) / 2));
  const features = `popup=yes,width=${popupWidth},height=${popupHeight},left=${left},top=${top},noopener,noreferrer`;

  return globalThis.open(url, '_blank', features);
}

function parseAuthReturnPath(search: string): string | null {
  const params = new URLSearchParams(search);
  const rawValue = params.get('returnTo')?.trim();

  if (!rawValue) {
    return null;
  }

  const normalized =
    rawValue === 'templates' ? '/templates'
      : rawValue === 'editor' || rawValue === 'home' ? '/editor'
        : rawValue === 'projects' ? '/projects'
          : rawValue === 'profile' ? '/profile'
            : rawValue;

  if (!normalized.startsWith('/')) {
    return null;
  }

  return /^\/(login|editor(?:\/[^/?#]+)?|templates|projects|profile)(?:[?#].*)?$/.test(normalized)
    ? normalized
    : null;
}

function parseEmailVerificationToken(search: string): string | null {
  const params = new URLSearchParams(search);
  const token = params.get('verifyEmailToken')?.trim();
  return token || null;
}

function parsePasswordResetToken(search: string): string | null {
  const params = new URLSearchParams(search);
  const token = params.get('resetPasswordToken')?.trim();
  return token || null;
}

function resolvePostLoginPath(returnPath: string | null): string {
  if (!returnPath || returnPath === '/login') {
    return '/templates';
  }

  return returnPath;
}

function resolveGuestPath(returnPath: string | null): string {
  if (!returnPath || returnPath === '/login' || returnPath.startsWith('/editor/')) {
    return '/editor';
  }

  return returnPath;
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

export function EditorApp({ theme, toggleTheme }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string; shareSlug?: string }>();

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
    strokeColor, setStrokeColor,
    strokeWidth, setStrokeWidth,
    rotation, setRotation,
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
  const emailVerificationTokenRef = useRef<string | null>(null);
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(parsePasswordResetToken(location.search));
  const [updatingTemplateId, setUpdatingTemplateId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const templateCreationSnapshotRef = useRef<{
    frames: DesignFrame[];
    projectId: string | null;
    projectName: string;
    projectDescription: string;
  } | null>(null);
  const lastPersistedSignatureRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const loadedSharedSlugRef = useRef<string | null>(null);
  const initializedProjectRef = useRef<string | null>(null);
  const authReturnPath = useMemo(() => parseAuthReturnPath(location.search), [location.search]);
  const emailVerificationToken = useMemo(() => parseEmailVerificationToken(location.search), [location.search]);
  const isAuthRoute = location.pathname === '/login';
  const isSharedRoute = location.pathname.startsWith('/shared/');
  const routeProjectId = params.projectId ?? null;
  const routeShareSlug = params.shareSlug ?? null;
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'manual-saving' | 'autosave-saving' | 'saved' | 'manual-failed' | 'autosave-failed'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareVisitors, setShareVisitors] = useState<Array<{ username: string; visitedAt: string }>>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalUrl, setShareModalUrl] = useState('');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [sharedProjectLoading, setSharedProjectLoading] = useState(false);
  const [sharedProjectUnavailable, setSharedProjectUnavailable] = useState(false);
  const [projectHydrating, setProjectHydrating] = useState(false);
  const [canvasReloadNonce, setCanvasReloadNonce] = useState(0);
  const isReadOnly = isSharedRoute;
  const isTemplatesMode = workspaceMode === 'templates';
  const isProfileView = !isTemplatesMode && sidebarPanel === 'account';
  const canOpenWorkspaceDirectly = Boolean(authUser || getAccessToken() || isGuestModeEnabled());

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
    openEditorWorkspace: frameActions.openEditorWorkspace,
    onProjectPersisted: (project) => {
      lastPersistedSignatureRef.current = createProjectSignature(
        parseEditorProjectData(project.data) ?? framesRef.current,
        project.name,
        project.description ?? ''
      );
      setHasUnsavedChanges(false);
      setSaveState('saved');
    },
    onProjectFramesApplied: () => {
      setCanvasReloadNonce((value) => value + 1);
    }
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
    setFillLayers, setActiveFillLayerId, setFillColor, setFillOpacity, setStrokeColor, setStrokeWidth, setRotation, setFillMode,
    setGradientStops, setOpacity, setFontSize, setFontFamily,
    setElementWidth, setElementHeight, setTextAlign, setSnapLines,
    saveCurrentFrame: history.saveCurrentFrame
  });

  const workspace = useWorkspace({
    canvasStageRef, activeFrame, workspaceMode, workspaceZoom, workspacePan, spacePressed,
    gridCursorTargetRef, gridCursorCurrentRef, gridCursorAnimationRef,
    isPanningRef, panStartRef, setWorkspaceZoom, setWorkspacePan
  });

  useCanvasSetup({
    canvasElementRef, fabricCanvasRef, framesRef, historyRef,
    activeToolRef, spacePressedRef, drawingObjectRef, drawStartRef,
    activeFrameId, workspaceMode,
    isReadOnly,
    canvasReloadNonce,
    isProjectHydrating: projectHydrating,
    addTextAt: objectActions.addTextAt,
    createDrawableObject: objectActions.createDrawableObject,
    saveCurrentFrame: history.saveCurrentFrame,
    persistFrameJson: history.persistFrameJson,
    setSelectedObject, setLayers, setCornerHandles, setResizeHandles,
    setActiveTool, setSnapLines,
    setFillLayers, setActiveFillLayerId, setFillColor, setFillOpacity,
    setStrokeColor, setStrokeWidth, setRotation,
    setFillMode, setGradientStops, setOpacity, setCornerRadii,
    setFontSize, setFontFamily, setTextAlign, setElementWidth, setElementHeight
  });

  useKeyboard({
    activeFrameId, fileInputRef, isPanningRef,
    isReadOnly,
    setSpacePressed, setActiveTool,
    removeSelected: objectActions.removeSelected,
    copySelected: objectActions.copySelected,
    pasteSelected: objectActions.pasteSelected,
    nudgeSelected: objectActions.nudgeSelected,
    undoFrame: history.undoFrame,
    redoFrame: history.redoFrame
  });

  // Start session on mount
  useEffect(() => { void auth.bootstrapSession(); }, []);

  useEffect(() => {
    const token = emailVerificationToken;
    if (!token) {
      return;
    }
    if (emailVerificationTokenRef.current === token) {
      return;
    }
    emailVerificationTokenRef.current = token;

    let cancelled = false;

    const applyVerificationToken = async () => {
      const ok = await auth.applyEmailVerificationToken(token);
      if (cancelled) {
        return;
      }

      setAuthMode('login');
      removeQueryParamFromCurrentUrl('verifyEmailToken');

      if (!ok) {
        // Token was consumed from URL; user can request a new one by registering again.
      }
    };

    void applyVerificationToken();

    return () => {
      cancelled = true;
    };
  }, [auth, emailVerificationToken, setAuthMode]);

  useEffect(() => {
    const nextToken = parsePasswordResetToken(location.search);
    setPasswordResetToken(nextToken);
    if (nextToken) {
      setAuthMode('login');
    }
  }, [location.search, setAuthMode]);

  useEffect(() => {
    if (isAuthRoute && authUser) {
      navigate(resolvePostLoginPath(authReturnPath), { replace: true });
    }
  }, [authReturnPath, authUser, isAuthRoute, navigate]);

  useEffect(() => {
    const pathname = location.pathname;
    if (pathname === '/templates') {
      if (workspaceMode !== 'templates') {
        setWorkspaceMode('templates');
      }
      if (sidebarPanel !== 'templates') {
        setSidebarPanel('templates');
      }
      return;
    }

    if (pathname === '/projects' || pathname === '/profile') {
      if (workspaceMode !== 'editor') {
        setWorkspaceMode('editor');
      }
      if (sidebarPanel !== 'account') {
        setSidebarPanel('account');
      }
      return;
    }

    if (pathname.startsWith('/editor') || pathname.startsWith('/shared/')) {
      if (workspaceMode !== 'editor') {
        setWorkspaceMode('editor');
      }
      if (sidebarPanel === 'account') {
        setSidebarPanel('templates');
      }
    }
  }, [location.pathname, setSidebarPanel, setWorkspaceMode, sidebarPanel, workspaceMode]);

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

  useEffect(() => {
    if (!routeShareSlug || !isSharedRoute) {
      loadedSharedSlugRef.current = null;
      setSharedProjectUnavailable(false);
      setSharedProjectLoading(false);
      setProjectHydrating(false);
      return;
    }

    if (loadedSharedSlugRef.current === routeShareSlug) {
      return;
    }

    let cancelled = false;

    const loadSharedProject = async () => {
      setSharedProjectUnavailable(false);
      setSharedProjectLoading(true);
      setProjectHydrating(true);
      const viewerName = (authUser?.name?.trim() || localStorage.getItem('webster-share-viewer-name') || `Guest-${Math.floor(Math.random() * 10000)}`).slice(0, 60);
      localStorage.setItem('webster-share-viewer-name', viewerName);
      const opened = await projects.openSharedProject(routeShareSlug, viewerName);
      if (cancelled) {
        return;
      }

      if (opened) {
        loadedSharedSlugRef.current = routeShareSlug;
        setSaveState('idle');
      } else {
        const nextFrames = createInitialFrames();
        historyRef.current = {};
        framesRef.current = nextFrames;
        setFrames(nextFrames);
        setActiveFrameId(nextFrames[0].id);
        setSelectedObject(null);
        setLayers([]);
        setCornerHandles([]);
        setResizeHandles([]);
        setProjectId(null);
        setProjectName(defaultProjectName);
        setProjectDescription('');
        setProjectStatus('');
        setShareStatus('');
        setShareError('');
        setHasUnsavedChanges(false);
        setSaveState('idle');
        setCanvasReloadNonce((value) => value + 1);
        loadedSharedSlugRef.current = null;
        setSharedProjectUnavailable(true);
      }

      setSharedProjectLoading(false);
      setProjectHydrating(false);
    };

    void loadSharedProject();

    return () => {
      cancelled = true;
    };
  }, [authUser?.name, isSharedRoute, routeShareSlug]);

  useEffect(() => {
    if (!routeProjectId || !location.pathname.startsWith('/editor/')) {
      setProjectHydrating(false);
      return;
    }

    if (authChecking) {
      return;
    }

    if (!authUser) {
      navigate(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`, { replace: true });
      return;
    }

    if (routeProjectId === projectId || openingProjectId === routeProjectId) {
      return;
    }

    let cancelled = false;

    const loadRequestedProject = async () => {
      setProjectHydrating(true);
      const opened = await projects.openSavedProject(routeProjectId);
      if (!opened && !cancelled) {
        navigate('/editor', { replace: true });
      }
      if (!cancelled) {
        setProjectHydrating(false);
      }
    };

    void loadRequestedProject();

    return () => {
      cancelled = true;
    };
  }, [
    authChecking,
    authUser,
    location.pathname,
    location.search,
    navigate,
    openingProjectId,
    projectId,
    routeProjectId
  ]);

  useEffect(() => {
    if (routeProjectId !== initializedProjectRef.current) {
      initializedProjectRef.current = null;
    }
  }, [routeProjectId]);

  useEffect(() => {
    if (isReadOnly || projectHydrating) {
      return;
    }
    if (!routeProjectId || routeProjectId !== projectId || frames.length === 0) {
      return;
    }
    if (initializedProjectRef.current === routeProjectId) {
      return;
    }

    initializedProjectRef.current = routeProjectId;
    setActiveFrameId(frames[0].id);
    setCanvasReloadNonce((value) => value + 1);
  }, [frames, isReadOnly, projectHydrating, projectId, routeProjectId, setActiveFrameId]);

  useEffect(() => {
    if (lastPersistedSignatureRef.current === null) {
      lastPersistedSignatureRef.current = createProjectSignature(frames, projectName, projectDescription);
    }
  }, [frames, projectDescription, projectName]);

  useEffect(() => {
    setShareStatus('');
    setShareError('');
  }, [isReadOnly, projectId]);

  useEffect(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (isAuthRoute || isTemplatesMode || authChecking || projectHydrating) {
      return;
    }

    if (isReadOnly) {
      setHasUnsavedChanges(false);
      setSaveState('idle');
      return;
    }

    const currentSignature = createProjectSignature(frames, projectName, projectDescription);
    const lastPersistedSignature = lastPersistedSignatureRef.current;
    const dirty = lastPersistedSignature !== currentSignature;

    setHasUnsavedChanges(dirty);

    if (!authUser) {
      setSaveState('idle');
      setShareStatus('');
      setShareError('');
      return;
    }

    if (!dirty) {
      if (projectId) {
        setSaveState('saved');
      } else {
        setSaveState('idle');
      }
      return;
    }

    setSaveState('dirty');

    if (!projectName.trim()) {
      return;
    }

    if (!projectId) {
      autosaveTimerRef.current = window.setTimeout(() => {
        void (async () => {
          setSaveState('autosave-saving');
          const savedProjectId = await projects.saveProjectToBackend('save-as-new');
          if (!savedProjectId) {
            setSaveState('autosave-failed');
            return;
          }
          lastPersistedSignatureRef.current = createProjectSignature(framesRef.current, projectName, projectDescription);
          setHasUnsavedChanges(false);
          setSaveState('saved');
          navigate(`/editor/${savedProjectId}`, { replace: true });
        })();
      }, 500);
      return;
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        setSaveState('autosave-saving');
        const expectedSignature = createProjectSignature(framesRef.current, projectName, projectDescription);
        const saved = await projects.autosaveProject();
        if (!saved) {
          setSaveState('autosave-failed');
          return;
        }
        lastPersistedSignatureRef.current = expectedSignature;
        setHasUnsavedChanges(false);
        setSaveState('saved');
        setProjectError('');
      })();
    }, 500);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    authChecking,
    authUser,
    frames,
    isAuthRoute,
    isReadOnly,
    isTemplatesMode,
    navigate,
    projectHydrating,
    projectDescription,
    projectId,
    projectName,
    projects,
    setProjectError
  ]);

  // --- Derived ---
  const activeName = selectedObject ? selectedObject.objectName ?? selectedObject.type ?? 'Object' : 'nothing selected';
  const isTextSelected = selectedObject instanceof Textbox || selectedObject?.type === 'textbox' || selectedObject?.type === 'text';
  const isShapeSelected = Boolean(selectedObject && selectedObject.type !== 'image' && !isTextSelected);
  const canEditCorners = Boolean(selectedObject && isCornerEditable(selectedObject));
  const activeFillLayer = fillLayers.find((layer) => layer.id === activeFillLayerId) ?? fillLayers[0];
  const currentSavedProject = savedProjects.find((item) => item.id === projectId) ?? null;
  const isProjectShared = Boolean(currentSavedProject?.isPublic && currentSavedProject?.shareSlug);
  const saveStatusLabel = isReadOnly
    ? sharedProjectLoading
      ? 'Loading shared project...'
      : 'Read-only shared project'
    : !authUser
      ? 'Autosave unavailable for guests'
      : saveState === 'manual-saving' || saveState === 'autosave-saving'
        ? 'Saving...'
        : saveState === 'manual-failed'
          ? 'Save failed'
          : saveState === 'autosave-failed'
            ? 'Autosave failed'
            : hasUnsavedChanges
              ? 'Unsaved changes'
              : projectId
                ? 'Saved'
                : 'Unsaved changes';
  const saveHint = !isReadOnly && authUser && !projectId ? 'Draft will be created automatically' : '';

  const copyShareLink = useCallback(async (shareSlug: string) => {
    const url = buildProjectShareUrl(shareSlug);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareStatus('Copied share link.');
        setShareError('');
        return;
      }
    } catch {
      // Clipboard access can be unavailable in some browsers or insecure contexts.
    }
    setShareStatus('Share link created.');
    setShareError('');
  }, []);

  const ensureProjectShareUrl = useCallback(async (options?: { copy?: boolean }) => {
    if (isReadOnly || shareBusy) {
      return null;
    }

    let ensuredProjectId = projectId;
    if (!ensuredProjectId) {
      const savedProjectId = await projects.saveProjectToBackend('save-as-new');
      if (!savedProjectId) {
        setShareStatus('');
        setShareError('Could not create draft before sharing.');
        return null;
      }
      ensuredProjectId = savedProjectId;
    }

    if (currentSavedProject?.shareSlug) {
      const existingUrl = buildProjectShareUrl(currentSavedProject.shareSlug);
      if (options?.copy) {
        await copyShareLink(currentSavedProject.shareSlug);
      }
      return existingUrl;
    }

    setShareBusy(true);
    setShareStatus('');
    setShareError('');
    try {
      const response = await projects.enableProjectShare();
      if (!response.shareSlug) {
        throw new Error('Share link was not returned.');
      }
      if (options?.copy) {
        await copyShareLink(response.shareSlug);
      } else {
        setShareStatus('Share link ready.');
        setShareError('');
      }
      return buildProjectShareUrl(response.shareSlug);
    } catch (error) {
      setShareError(getErrorMessage(error, 'Could not create the public share link.'));
      return null;
    } finally {
      setShareBusy(false);
    }
  }, [copyShareLink, currentSavedProject?.shareSlug, isReadOnly, projectId, projects, shareBusy]);

  const shareCurrentProject = useCallback(async () => {
    const shareUrl = await ensureProjectShareUrl();
    if (!shareUrl || !projectId) {
      return;
    }

    const details = await projects.getProjectShareDetails(projectId);
    setShareVisitors(details.visitors);
    setShareModalUrl(shareUrl);
    setShareModalOpen(true);
  }, [ensureProjectShareUrl, projectId, projects]);

  const shareProjectToSocial = useCallback(async (platform: SocialPlatform) => {
    const shareUrl = await ensureProjectShareUrl();
    if (!shareUrl) {
      return;
    }

    const popup = openSocialSharePopup(buildSocialShareUrl(platform, shareUrl, projectName));
    if (!popup) {
      setShareStatus('');
      setShareError('Allow pop-ups to open the social share window.');
      return;
    }

    const platformLabel = platform === 'x' ? 'X' : platform === 'linkedin' ? 'LinkedIn' : 'Facebook';
    setShareStatus(`Opened ${platformLabel} share.`);
    setShareError('');
  }, [ensureProjectShareUrl, projectName]);

  const disableSharedProject = useCallback(async () => {
    if (isReadOnly || shareBusy) {
      return;
    }

    setShareBusy(true);
    setShareStatus('');
    setShareError('');
    try {
      await projects.disableProjectShare();
      setShareStatus('Share link disabled.');
    } catch (error) {
      setShareError(getErrorMessage(error, 'Could not disable the public share link.'));
    } finally {
      setShareBusy(false);
    }
  }, [isReadOnly, projects, shareBusy]);

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

  const openLoginRoute = useCallback((returnTo = `${location.pathname}${location.search}`) => {
    const nextParams = new URLSearchParams();
    if (returnTo && returnTo !== '/login') {
      nextParams.set('returnTo', returnTo);
    }

    navigate(`/login${nextParams.toString() ? `?${nextParams.toString()}` : ''}`);
  }, [location.pathname, location.search, navigate]);

  const openEditorRoute = useCallback((nextProjectId: string | null = projectId) => {
    frameActions.handleSidebarSelect('templates');
    frameActions.openEditorWorkspace();
    navigate(!isReadOnly && nextProjectId ? `/editor/${nextProjectId}` : '/editor');
  }, [frameActions, isReadOnly, navigate, projectId]);

  const openTemplatesRoute = useCallback(() => {
    setSidebarPanel('templates');
    setWorkspaceMode('templates');
    navigate('/templates');
  }, [navigate, setSidebarPanel, setWorkspaceMode]);

  const openProjectsRoute = useCallback((target: '/projects' | '/profile' = '/projects') => {
    setWorkspaceMode('editor');
    setSidebarPanel('account');
    navigate(target);
  }, [navigate, setSidebarPanel, setWorkspaceMode]);

  const viewFrameReadOnly = useCallback((frameId: string) => {
    setWorkspaceMode('editor');
    setActiveFrameId(frameId);
    setWorkspacePan({ x: 0, y: 0 });
    setWorkspaceZoom(0.62);
    setActiveTool('select');
  }, [setActiveFrameId, setActiveTool, setWorkspaceMode, setWorkspacePan, setWorkspaceZoom]);

  const logoutAndOpenLogin = useCallback(() => {
    auth.logoutUser();
    navigate('/login', { replace: true });
  }, [auth, navigate]);

  const copySharedProjectToDrafts = useCallback(async () => {
    if (!routeShareSlug) {
      return;
    }
    try {
      const clone = await projects.cloneSharedProjectToDrafts(routeShareSlug);
      await projects.refreshSavedProjects(true);
      navigate(`/editor/${clone.id}`);
    } catch (error) {
      setProjectError(getErrorMessage(error, 'Could not copy shared project to Drafts.'));
    }
  }, [navigate, projects, routeShareSlug, setProjectError]);

  const openSavedProjectAndRoute = useCallback(async (id: string) => {
    const opened = await projects.openSavedProject(id);
    if (opened) {
      navigate(`/editor/${id}`);
    }
  }, [navigate, projects]);

  const deleteSavedProjectAndRoute = useCallback(async (id: string) => {
    const deleted = await projects.deleteSavedProject(id);
    if (deleted && projectId === id) {
      navigate('/editor', { replace: true });
    }
  }, [navigate, projectId, projects]);

  if (authChecking) {
    return (
      <main className="auth-page" aria-label="Authentication loading">
        <section className="auth-card auth-card-loading">
          <h1>Checking your session...</h1>
        </section>
      </main>
    );
  }

  if (isAuthRoute && !authUser) {
    return (
      <AuthPage
        theme={theme}
        toggleTheme={toggleTheme}
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
        submitAuth={async () => {
          const ok = await auth.submitAuth();
          if (ok) {
            navigate(resolvePostLoginPath(authReturnPath), { replace: true });
          }
          return ok;
        }}
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
          enableGuestMode();
          auth.resetAuthMessages();
          navigate(resolveGuestPath(authReturnPath), { replace: true });
        }}
      />
    );
  }

  if (isSharedRoute && sharedProjectUnavailable && !sharedProjectLoading) {
    return (
      <main className="auth-page shared-project-unavailable-page" aria-label="Shared project unavailable">
        <section className="auth-card shared-project-unavailable-card">
          <header className="auth-head">
            <h1>This shared project is no longer available.</h1>
            <p>The public link is missing, disabled, or no longer accessible.</p>
          </header>
          <button
            className="wide-action sidebar-btn-primary"
            onClick={() => navigate(canOpenWorkspaceDirectly ? '/editor' : '/login', { replace: true })}
            type="button"
          >
            {canOpenWorkspaceDirectly ? 'Open Webster' : 'Go to login'}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={isTemplatesMode ? 'designer-shell templates-mode' : isProfileView ? 'designer-shell profile-mode' : 'designer-shell'}>
      <EditorSidebar
        isReadOnly={isReadOnly}
        theme={theme}
        toggleTheme={toggleTheme}
        autosaveLabel={saveStatusLabel}
        saveHint={saveHint}
        isTemplatesMode={isTemplatesMode}
        isProfileView={isProfileView}
        sidebarPanel={sidebarPanel}
        handleSidebarSelect={frameActions.handleSidebarSelect}
        addFrame={frameActions.addFrame}
        frames={frames}
        activeFrameId={activeFrameId}
        switchFrame={frameActions.switchFrame}
        viewFrameReadOnly={viewFrameReadOnly}
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
        logoutUser={logoutAndOpenLogin}
        openAuthPage={() => {
          auth.resetAuthMessages();
          openLoginRoute();
        }}
        authStatus={authStatus}
        authError={authError}
        canManageSavedProjects={projects.canManageSavedProjects}
        isProjectShared={isProjectShared}
        projectId={projectId}
        projectName={projectName}
        setProjectName={setProjectName}
        projectDescription={projectDescription}
        setProjectDescription={setProjectDescription}
        defaultProjectName={defaultProjectName}
        undoFrame={history.undoFrame}
        redoFrame={history.redoFrame}
        historyBranches={history.listBranches()}
        switchHistoryBranch={history.switchBranch}
        shareProject={shareCurrentProject}
        copySharedProjectToDrafts={copySharedProjectToDrafts}
        disableProjectShare={disableSharedProject}
        shareBusy={shareBusy}
        shareStatus={shareStatus}
        shareError={shareError}
        isSavingProject={isSavingProject}
        projectRequestBusy={projects.projectRequestBusy}
        refreshSavedProjects={projects.refreshSavedProjects}
        savedProjectsLoading={savedProjectsLoading}
        exportProject={() => projects.exportProject(setProjectStatus, setProjectError)}
        exportProjectFromBackend={(format) => projects.exportProjectFromBackend(format, setProjectStatus, setProjectError)}
        importInputRef={importInputRef}
        importProject={(event) => projects.importProject(event, () => navigate('/editor'))}
        projectStatus={projectStatus}
        projectError={projectError}
        savedProjectsError={savedProjectsError}
        savedProjects={savedProjects}
        openSavedProject={openSavedProjectAndRoute}
        openingProjectId={openingProjectId}
        deleteSavedProject={deleteSavedProjectAndRoute}
        deletingProjectId={deletingProjectId}
        formatSavedProjectDate={formatSavedProjectDate}
        owlMascot={owlMascot}
        openEditorRoute={openEditorRoute}
        openTemplatesRoute={openTemplatesRoute}
        openProjectsRoute={() => openProjectsRoute('/projects')}
      />

      {isProfileView ? (
        <ProfilePage
          viewMode={location.pathname === '/projects' ? 'projects' : 'profile'}
          authUser={authUser}
          savedProjects={savedProjects}
          projectId={projectId}
          projectRequestBusy={projects.projectRequestBusy}
          savedProjectsLoading={savedProjectsLoading}
          openingProjectId={openingProjectId}
          deletingProjectId={deletingProjectId}
          openSavedProject={openSavedProjectAndRoute}
          deleteSavedProject={deleteSavedProjectAndRoute}
          refreshSavedProjects={() => projects.refreshSavedProjects()}
          openAuthPage={() => {
            auth.resetAuthMessages();
            openLoginRoute();
          }}
          logoutUser={logoutAndOpenLogin}
          openEditorWorkspace={() => openEditorRoute(projectId)}
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
        isReadOnly={isReadOnly}
        isTemplatesMode={isTemplatesMode}
        activeFrameName={activeFrame.name}
        activeFrameSizeLabel={`${activeFrame.width} x ${activeFrame.height}`}
        projectName={projectName}
        setProjectName={setProjectName}
        projectId={projectId}
        saveStatusLabel={saveStatusLabel}
        saveHint={saveHint}
        projectStatus={projectStatus}
        projectRequestBusy={projects.projectRequestBusy}
        openEditorWorkspace={() => openEditorRoute(projectId)}
        openProjectsWorkspace={() => openProjectsRoute('/projects')}
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
        shareCurrentProject={() => { void shareCurrentProject(); }}
        openHistoryModal={() => setHistoryModalOpen(true)}
        shareModalOpen={shareModalOpen}
        shareModalUrl={shareModalUrl}
        shareVisitors={shareVisitors}
        closeShareModal={() => setShareModalOpen(false)}
        copyShareModalLink={async () => {
          const slug = shareModalUrl.split('/shared/')[1];
          if (!slug) {
            return;
          }
          await copyShareLink(slug);
        }}
        historyModalOpen={historyModalOpen}
        closeHistoryModal={() => setHistoryModalOpen(false)}
        historyBranches={history.listBranches()}
        historySteps={history.listActiveBranchSteps()}
        switchHistoryBranch={history.switchBranch}
        restoreHistoryStep={(index) => history.restoreHistoryStep(index)}
        shareToLinkedIn={() => { void shareProjectToSocial('linkedin'); }}
        shareToFacebook={() => { void shareProjectToSocial('facebook'); }}
        shareToX={() => { void shareProjectToSocial('x'); }}
        disableProjectShare={() => { void disableSharedProject(); }}
        isProjectShared={isProjectShared}
        shareBusy={shareBusy}
        shareStatus={shareStatus}
        shareError={shareError}
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
        createProjectFromTemplate={(template) => {
          createProjectFromTemplateWithSnapshot(template);
          navigate('/editor');
        }}
        undoTemplateProjectCreation={() => {
          const previousProjectId = templateCreationSnapshotRef.current?.projectId ?? null;
          const reverted = undoTemplateProjectCreation();
          if (reverted) {
            navigate(previousProjectId ? `/editor/${previousProjectId}` : '/editor');
          }
          return reverted;
        }}
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
        isReadOnly={isReadOnly}
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
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        updateStrokeColor={objectActions.updateStrokeColor}
        updateStrokeWidth={objectActions.updateStrokeWidth}
        rotation={rotation}
        updateRotation={objectActions.updateRotation}
        elementWidth={elementWidth}
        elementHeight={elementHeight}
        updateElementWidth={objectActions.updateElementWidth}
        updateElementHeight={objectActions.updateElementHeight}
        updateImageCornerRadius={objectActions.updateImageCornerRadius}
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
