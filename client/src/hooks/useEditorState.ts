import { useState } from 'react';
import { AuthMode, CornerHandle, CornerRadii, DesignFrame, FillLayer, FillMode, GradientStopItem, LayerItem, ResizeHandle, SidebarPanel, SnapLine, ToolMode, WebsterObject, createId, defaultProjectName } from '../lib/editorTypes';
import { ProjectRecord } from '../api/projects';
import { AuthUser } from '../api/auth';

export function useEditorState(initialFrames: DesignFrame[]) {
  const [frames, setFrames] = useState<DesignFrame[]>(initialFrames);
  const [activeFrameId, setActiveFrameId] = useState(initialFrames[1].id);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedObject, setSelectedObject] = useState<WebsterObject | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [fillColor, setFillColor] = useState('#1f2937');
  const [fillOpacity, setFillOpacity] = useState(1);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [fillMode, setFillMode] = useState<FillMode>('solid');
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(56);
  const [fontFamily, setFontFamily] = useState('Inter, Segoe UI, sans-serif');
  const [cornerRadii, setCornerRadii] = useState<CornerRadii>({ topLeft: 14, topRight: 14, bottomRight: 14, bottomLeft: 14 });
  const [gradientStops, setGradientStops] = useState<GradientStopItem[]>([
    { id: createId(), offset: 0, color: '#111827', opacity: 1 },
    { id: createId(), offset: 1, color: '#ffffff', opacity: 1 }
  ]);
  const [fillLayers, setFillLayers] = useState<FillLayer[]>([{ id: createId(), mode: 'solid', color: '#1f2937', opacity: 1, stops: [{ id: createId(), offset: 0, color: '#1f2937', opacity: 1 }, { id: createId(), offset: 1, color: '#ffffff', opacity: 1 }] }]);
  const [activeFillLayerId, setActiveFillLayerId] = useState<string>('');
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [cornerHandles, setCornerHandles] = useState<CornerHandle[]>([]);
  const [resizeHandles, setResizeHandles] = useState<ResizeHandle[]>([]);
  const [workspaceZoom, setWorkspaceZoom] = useState(0.62);
  const [workspacePan, setWorkspacePan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [frameWidthInput, setFrameWidthInput] = useState('');
  const [frameHeightInput, setFrameHeightInput] = useState('');
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [workspaceMode, setWorkspaceMode] = useState<'templates' | 'editor'>('templates');
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>('templates');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(defaultProjectName);
  const [projectDescription, setProjectDescription] = useState('');
  const [savedProjects, setSavedProjects] = useState<ProjectRecord[]>([]);
  const [savedProjectsLoading, setSavedProjectsLoading] = useState(false);
  const [savedProjectsError, setSavedProjectsError] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [projectError, setProjectError] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authStatus, setAuthStatus] = useState('');

  return {
    frames, setFrames, activeFrameId, setActiveFrameId, layers, setLayers, selectedObject, setSelectedObject, showGrid, setShowGrid,
    fillColor, setFillColor, fillOpacity, setFillOpacity, fillMode, setFillMode, opacity, setOpacity, fontSize, setFontSize,
    strokeColor, setStrokeColor, strokeWidth, setStrokeWidth, rotation, setRotation,
    fontFamily, setFontFamily, cornerRadii, setCornerRadii, gradientStops, setGradientStops, fillLayers, setFillLayers,
    activeFillLayerId, setActiveFillLayerId, elementWidth, setElementWidth, elementHeight, setElementHeight, textAlign, setTextAlign,
    snapLines, setSnapLines, cornerHandles, setCornerHandles, resizeHandles, setResizeHandles, workspaceZoom, setWorkspaceZoom,
    workspacePan, setWorkspacePan, spacePressed, setSpacePressed, frameWidthInput, setFrameWidthInput, frameHeightInput,
    setFrameHeightInput, activeTool, setActiveTool, workspaceMode, setWorkspaceMode, sidebarPanel, setSidebarPanel,
    projectId, setProjectId, projectName, setProjectName, projectDescription, setProjectDescription, savedProjects, setSavedProjects,
    savedProjectsLoading, setSavedProjectsLoading, savedProjectsError, setSavedProjectsError, projectStatus, setProjectStatus,
    projectError, setProjectError, isSavingProject, setIsSavingProject, openingProjectId, setOpeningProjectId,
    deletingProjectId, setDeletingProjectId, authUser, setAuthUser, authMode, setAuthMode, authName, setAuthName,
    authEmail, setAuthEmail, authPassword, setAuthPassword, authLoading, setAuthLoading, authChecking, setAuthChecking,
    authError, setAuthError, authStatus, setAuthStatus
  };
}
