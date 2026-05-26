import { Dispatch, MutableRefObject, SetStateAction, ChangeEvent } from 'react';
import {
  createProject as createProjectRequest,
  cloneSharedProject as cloneSharedProjectRequest,
  deleteProject as deleteProjectRequest,
  disableProjectShare as disableProjectShareRequest,
  enableProjectShare as enableProjectShareRequest,
  exportProjectFile,
  importWebsterProjectFile,
  getProject,
  getProjectShareDetails as getProjectShareDetailsRequest,
  getSharedProject as getSharedProjectRequest,
  listProjects,
  updateProject as updateProjectRequest,
  type ProjectExportFormat,
  type ProjectPayload,
  type ProjectShareRecord,
  type ProjectRecord
} from '../api/projects';
import { type AuthUser } from '../api/auth';
import { createTemplate as createTemplateRequest } from '../api/templates';
import { clearAccessToken, getAccessToken, getHttpErrorStatus } from '../api/http';
import { CornerHandle, DesignFrame, FrameHistory, GalleryTemplate, LayerItem, ResizeHandle, WebsterObject, createId } from '../lib/editorTypes';
import {
  createDefaultGradientStops,
  createEditorProjectSnapshot,
  deriveProjectName,
  getErrorMessage,
  isRecord,
  parseEditorProjectData
} from '../lib/editorHelpers';

interface Params {
  framesRef: MutableRefObject<DesignFrame[]>;
  historyRef: MutableRefObject<Record<string, FrameHistory>>;
  authUser: AuthUser | null;
  projectId: string | null;
  projectName: string;
  projectDescription: string;
  savedProjectsLoading: boolean;
  isSavingProject: boolean;
  openingProjectId: string | null;
  deletingProjectId: string | null;
  savedProjects: ProjectRecord[];
  setFrames: (frames: DesignFrame[]) => void;
  setActiveFrameId: (id: string) => void;
  setSelectedObject: (obj: WebsterObject | null) => void;
  setLayers: (layers: LayerItem[]) => void;
  setCornerHandles: (handles: CornerHandle[]) => void;
  setResizeHandles: (handles: ResizeHandle[]) => void;
  setProjectId: (id: string | null) => void;
  setProjectName: (name: string) => void;
  setProjectDescription: (desc: string) => void;
  setProjectError: (error: string) => void;
  setProjectStatus: (status: string) => void;
  setIsSavingProject: (saving: boolean) => void;
  setOpeningProjectId: (id: string | null) => void;
  setDeletingProjectId: (id: string | null) => void;
  setSavedProjects: Dispatch<SetStateAction<ProjectRecord[]>>;
  setSavedProjectsLoading: (loading: boolean) => void;
  setSavedProjectsError: (error: string) => void;
  setAuthUser: (user: AuthUser | null) => void;
  setAuthError: (error: string) => void;
  saveCurrentFrame: (recordHistory?: boolean) => void;
  openEditorWorkspace: () => void;
  onProjectPersisted?: (project: Pick<ProjectRecord, 'id' | 'name' | 'description' | 'data'>) => void;
  onProjectFramesApplied?: () => void;
}

export function useProjects({
  framesRef, historyRef,
  authUser, projectId, projectName, projectDescription,
  savedProjectsLoading, isSavingProject, openingProjectId, deletingProjectId, savedProjects,
  setFrames, setActiveFrameId, setSelectedObject, setLayers, setCornerHandles, setResizeHandles,
  setProjectId, setProjectName, setProjectDescription, setProjectError, setProjectStatus,
  setIsSavingProject, setOpeningProjectId, setDeletingProjectId,
  setSavedProjects, setSavedProjectsLoading, setSavedProjectsError,
  setAuthUser, setAuthError,
  saveCurrentFrame, openEditorWorkspace, onProjectPersisted, onProjectFramesApplied
}: Params) {
  const canManageSavedProjects = Boolean(authUser);
  const projectRequestBusy =
    isSavingProject || savedProjectsLoading || openingProjectId !== null || deletingProjectId !== null;

  const handleUnauthorizedProjectAccess = (message: string): boolean => {
    if (!/authorization|token|unauthorized|expired/i.test(message)) return false;
    clearAccessToken();
    setAuthUser(null);
    setSavedProjects([]);
    setProjectId(null);
    setSavedProjectsError('');
    setAuthError('Your session expired. Please log in again.');
    return true;
  };

  const applyProjectFrames = (
    nextFrames: DesignFrame[],
    meta?: { projectId?: string | null; name?: string; description?: string | null }
  ) => {
    historyRef.current = {};
    framesRef.current = nextFrames;
    setFrames(nextFrames);
    setActiveFrameId(nextFrames[0].id);
    setSelectedObject(null);
    setLayers([]);
    setCornerHandles([]);
    setResizeHandles([]);
    setProjectId(meta?.projectId ?? null);
    setProjectName(meta?.name?.trim() || deriveProjectName(nextFrames));
    setProjectDescription(meta?.description ?? '');
    setProjectError('');
    openEditorWorkspace();
    onProjectFramesApplied?.();
  };

  const refreshSavedProjects = async (silentIfLoggedOut = false) => {
    if (!getAccessToken()) {
      setSavedProjects([]);
      setSavedProjectsLoading(false);
      if (!silentIfLoggedOut) setSavedProjectsError('');
      return;
    }
    if (savedProjectsLoading) return;
    setSavedProjectsLoading(true);
    setSavedProjectsError('');
    try {
      const projects = await listProjects();
      setSavedProjects(projects);
    } catch (error) {
      const message = getErrorMessage(error, 'Could not load saved projects.');
      if (!handleUnauthorizedProjectAccess(message)) setSavedProjectsError(message);
    } finally {
      setSavedProjectsLoading(false);
    }
  };

  const buildProjectPayload = (): ProjectPayload => {
    saveCurrentFrame();
    const snapshot = createEditorProjectSnapshot(framesRef.current);
    if (!parseEditorProjectData(snapshot)) {
      throw new Error('Project data is invalid and could not be serialized.');
    }
    return {
      name: projectName.trim(),
      description: projectDescription.trim() || undefined,
      data: snapshot as Record<string, unknown>
    };
  };

  const syncLocalProjectMeta = (project: Pick<ProjectRecord, 'id' | 'name' | 'description' | 'data'>) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setProjectDescription(project.description ?? '');
    onProjectPersisted?.(project);
  };

  const saveProjectToBackend = async (mode: 'save' | 'save-as-new'): Promise<string | null> => {
    if (!canManageSavedProjects) { setProjectError('Log in to save projects to the backend.'); return null; }
    if (projectRequestBusy) return null;
    if (!projectName.trim()) {
      setProjectError('Project name is required before saving.');
      setProjectStatus('');
      return null;
    }
    setIsSavingProject(true);
    setProjectError('');
    setProjectStatus(mode === 'save' && projectId ? 'Saving project changes...' : 'Saving project to backend...');
    try {
      const payload = buildProjectPayload();
      const response = mode === 'save' && projectId
        ? await updateProjectRequest(projectId, payload)
        : await createProjectRequest(payload);
      syncLocalProjectMeta(response);
      setProjectStatus(mode === 'save' && projectId ? 'Project saved.' : 'New project saved.');
      await refreshSavedProjects(true);
      return response.id;
    } catch (error) {
      const message = getErrorMessage(error, 'Could not save the project.');
      if (!handleUnauthorizedProjectAccess(message)) setProjectError(message);
      return null;
    } finally {
      setIsSavingProject(false);
    }
  };

  const autosaveProject = async (): Promise<boolean> => {
    if (!canManageSavedProjects || !projectId || isSavingProject || openingProjectId || deletingProjectId) {
      return false;
    }

    try {
      const response = await updateProjectRequest(projectId, buildProjectPayload());
      syncLocalProjectMeta(response);
      setSavedProjects((current) => current.map((item) => (item.id === response.id ? response : item)));
      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'Could not autosave the project.');
      if (!handleUnauthorizedProjectAccess(message)) {
        setProjectError(message);
      }
      return false;
    }
  };

  const openSavedProject = async (id: string): Promise<boolean> => {
    if (!canManageSavedProjects) { setProjectError('Log in to open saved projects.'); return false; }
    if (projectRequestBusy) return false;
    setOpeningProjectId(id);
    setProjectError('');
    setProjectStatus('Loading saved project...');
    try {
      const project = await getProject(id);
      const nextFrames = parseEditorProjectData(project.data);
      if (!nextFrames) throw new Error('Saved project data is invalid or corrupted.');
      applyProjectFrames(nextFrames, { projectId: project.id, name: project.name, description: project.description });
      onProjectPersisted?.(project);
      setProjectStatus('');
      await refreshSavedProjects(true);
      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'Could not open the saved project.');
      if (!handleUnauthorizedProjectAccess(message)) setProjectError(message);
      return false;
    } finally {
      setOpeningProjectId(null);
    }
  };

  const openSharedProject = async (slug: string, viewerName?: string): Promise<boolean> => {
    setProjectError('');
    setProjectStatus('Loading shared project...');

    try {
      const project = await getSharedProjectRequest(slug, viewerName);
      const nextFrames = parseEditorProjectData(project.data);
      if (!nextFrames) throw new Error('Shared project data is invalid or corrupted.');
      applyProjectFrames(nextFrames, { projectId: project.id, name: project.name, description: project.description });
      onProjectPersisted?.(project);
      setProjectStatus('');
      return true;
    } catch (error) {
      const status = getHttpErrorStatus(error);
      setProjectStatus('');
      setProjectError(
        status === 403 || status === 404
          ? 'This shared project is no longer available.'
          : getErrorMessage(error, 'This shared project is no longer available.')
      );
      return false;
    }
  };

  const deleteSavedProject = async (id: string): Promise<boolean> => {
    if (!canManageSavedProjects) { setProjectError('Log in to delete saved projects.'); return false; }
    if (projectRequestBusy) return false;
    const target = savedProjects.find((p) => p.id === id);
    const label = target?.name ?? 'this project';
    if (!window.confirm(`Delete "${label}" from saved projects? This cannot be undone.`)) return false;
    setDeletingProjectId(id);
    setProjectError('');
    setProjectStatus('Deleting saved project...');
    try {
      await deleteProjectRequest(id);
      setSavedProjects((current) => current.filter((p) => p.id !== id));
      if (projectId === id) {
        setProjectId(null);
        setProjectStatus('Saved project deleted. Current canvas remains open as an unsaved draft.');
      } else {
        setProjectStatus('Saved project deleted.');
      }
      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'Could not delete the saved project.');
      if (!handleUnauthorizedProjectAccess(message)) setProjectError(message);
      return false;
    } finally {
      setDeletingProjectId(null);
    }
  };

  const createProjectFromTemplate = (template: GalleryTemplate) => {
    const fitFrameContentToViewport = (frame: DesignFrame): DesignFrame => {
      if (!frame.json || !Array.isArray(frame.json.objects)) {
        return frame;
      }

      const margin = 20;
      const objects = frame.json.objects.filter(isRecord) as Array<Record<string, unknown>>;
      if (objects.length === 0) {
        return frame;
      }

      const getBox = (entry: Record<string, unknown>) => {
        const left = typeof entry.left === 'number' ? entry.left : 0;
        const top = typeof entry.top === 'number' ? entry.top : 0;
        const width = typeof entry.width === 'number' ? entry.width : 0;
        const height = typeof entry.height === 'number' ? entry.height : 0;
        const scaleX = typeof entry.scaleX === 'number' ? entry.scaleX : 1;
        const scaleY = typeof entry.scaleY === 'number' ? entry.scaleY : 1;
        const w = Math.max(0, width * scaleX);
        const h = Math.max(0, height * scaleY);
        return { left, top, right: left + w, bottom: top + h };
      };

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const object of objects) {
        const box = getBox(object);
        minX = Math.min(minX, box.left);
        minY = Math.min(minY, box.top);
        maxX = Math.max(maxX, box.right);
        maxY = Math.max(maxY, box.bottom);
      }

      const contentWidth = Math.max(1, maxX - minX);
      const contentHeight = Math.max(1, maxY - minY);
      const allowedWidth = Math.max(1, frame.width - margin * 2);
      const allowedHeight = Math.max(1, frame.height - margin * 2);
      const scale = Math.min(1, allowedWidth / contentWidth, allowedHeight / contentHeight);

      const scaledWidth = contentWidth * scale;
      const scaledHeight = contentHeight * scale;
      const offsetX = margin + (allowedWidth - scaledWidth) / 2;
      const offsetY = margin + (allowedHeight - scaledHeight) / 2;

      const nextObjects = objects.map((entry) => {
        const next = { ...entry };
        const left = typeof next.left === 'number' ? next.left : 0;
        const top = typeof next.top === 'number' ? next.top : 0;
        next.left = (left - minX) * scale + offsetX;
        next.top = (top - minY) * scale + offsetY;
        if (typeof next.scaleX === 'number') {
          next.scaleX = next.scaleX * scale;
        } else if (scale !== 1) {
          next.scaleX = scale;
        }
        if (typeof next.scaleY === 'number') {
          next.scaleY = next.scaleY * scale;
        } else if (scale !== 1) {
          next.scaleY = scale;
        }
        return next;
      });

      return {
        ...frame,
        json: {
          ...frame.json,
          objects: nextObjects
        }
      };
    };

    if (template.templateData) {
      const parsedFrames = parseEditorProjectData(template.templateData);
      if (parsedFrames && parsedFrames.length > 0) {
        const firstFrame = fitFrameContentToViewport({ ...parsedFrames[0] });
        applyProjectFrames([firstFrame], { projectId: null, name: template.title, description: template.subtitle });
        return;
      }
    }

    const nextFrame: DesignFrame = {
      id: createId(),
      name: template.title,
      description: template.subtitle,
      width: template.width,
      height: template.height,
      backgroundColor: '#ffffff',
      backgroundOpacity: 1,
      backgroundMode: 'solid',
      backgroundStops: createDefaultGradientStops('#ffffff', '#d9d9d9'),
      json: { objects: [] }
    };
    applyProjectFrames([nextFrame], { projectId: null, name: template.title, description: template.subtitle });
  };

  const createTemplateFromCurrentProject = async (
    setStatus: (s: string) => void,
    setError: (s: string) => void
  ) => {
    if (!canManageSavedProjects) {
      setError('Log in to create reusable templates.');
      return;
    }

    saveCurrentFrame();
    const currentFrames = framesRef.current;
    if (!currentFrames.length) {
      setError('Could not create template: project has no frames.');
      return;
    }

    const templateName = window.prompt('Template name', `${projectName.trim() || 'Custom'} template`);
    if (templateName === null) {
      return;
    }

    const templateCategory = window.prompt('Template category', 'custom');
    if (templateCategory === null) {
      return;
    }

    const baseFrame = currentFrames[0];
    setError('');
    setStatus('Saving template...');

    try {
      await createTemplateRequest({
        name: templateName.trim() || `${projectName.trim() || 'Custom'} template`,
        category: templateCategory.trim().toLowerCase() || 'custom',
        width: baseFrame.width,
        height: baseFrame.height,
        data: createEditorProjectSnapshot(currentFrames) as Record<string, unknown>
      });
      setStatus('Template saved. It is now available in the template gallery.');
    } catch (error) {
      const message = getErrorMessage(error, 'Could not save template.');
      if (!handleUnauthorizedProjectAccess(message)) {
        setError(message);
      }
    }
  };

  const exportProject = async (setStatus: (s: string) => void, setError: (s: string) => void) => {
    await exportProjectAsWebster(setStatus, setError);
  };

  const exportProjectFromBackend = async (
    format: ProjectExportFormat,
    setStatus: (s: string) => void,
    setError: (s: string) => void,
    targetProjectId?: string
  ) => {
    if (!canManageSavedProjects) {
      setError('Log in to export project files from backend.');
      return;
    }
    const exportProjectId = targetProjectId ?? projectId;
    if (!exportProjectId) {
      setError('Save the project first to use server-side export.');
      return;
    }

    setError('');
    setStatus(`Exporting ${format.toUpperCase()} from backend...`);

    try {
      const exported = await exportProjectFile(exportProjectId, format);
      const link = document.createElement('a');
      link.download = exported.fileName;
      link.href = URL.createObjectURL(exported.blob);
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus(`Exported ${format.toUpperCase()} from backend.`);
    } catch (error) {
      const message = getErrorMessage(error, `Could not export ${format.toUpperCase()} from backend.`);
      if (!handleUnauthorizedProjectAccess(message)) {
        setError(message);
      }
    }
  };

  const importProject = (event: ChangeEvent<HTMLInputElement>, onImported?: (projectId: string | null) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const importFromBinary = async () => {
      if (!canManageSavedProjects) {
        setProjectError('Log in to import project files.');
        event.target.value = '';
        return;
      }
      setProjectError('');
      setProjectStatus('Importing WEBSTER on backend...');
      try {
        const created = await importWebsterProjectFile(file);
        const nextFrames = parseEditorProjectData(created.data);
        if (!nextFrames) throw new Error('Project binary data is invalid or corrupted.');
        applyProjectFrames(nextFrames, { projectId: created.id, name: created.name, description: created.description ?? '' });
        onProjectPersisted?.(created);
        await refreshSavedProjects(true);
        setProjectStatus('Project imported from .webster file.');
        onImported?.(created.id);
      } catch (error) {
        setProjectError(getErrorMessage(error, 'Could not import the .webster file.'));
      } finally {
        event.target.value = '';
      }
    };

    void importFromBinary();
  };

  const enableProjectShare = async (): Promise<ProjectShareRecord> => {
    if (!canManageSavedProjects) {
      throw new Error('Log in to create public share links.');
    }
    if (!projectId) {
      throw new Error('Save the project first to create a public share link.');
    }

    try {
      const response = await enableProjectShareRequest(projectId);
      setSavedProjects((current) => current.map((item) => (
        item.id === projectId ? { ...item, isPublic: response.isPublic, shareSlug: response.shareSlug } : item
      )));
      return response;
    } catch (error) {
      const message = getErrorMessage(error, 'Could not create the public share link.');
      if (handleUnauthorizedProjectAccess(message)) {
        throw new Error('Your session expired. Please log in again.');
      }
      throw new Error(message);
    }
  };

  const disableProjectShare = async (): Promise<void> => {
    if (!canManageSavedProjects || !projectId) {
      throw new Error('Open a saved project to disable sharing.');
    }

    try {
      await disableProjectShareRequest(projectId);
      setSavedProjects((current) => current.map((item) => (
        item.id === projectId ? { ...item, isPublic: false, shareSlug: null } : item
      )));
    } catch (error) {
      const message = getErrorMessage(error, 'Could not disable the public share link.');
      if (handleUnauthorizedProjectAccess(message)) {
        throw new Error('Your session expired. Please log in again.');
      }
      throw new Error(message);
    }
  };

  const exportProjectAsWebster = async (
    setStatus: (s: string) => void,
    setError: (s: string) => void,
    targetProjectId?: string
  ) => {
    if (!canManageSavedProjects) {
      setError('Log in to export project files.');
      return;
    }

    const sourceProjectId = targetProjectId ?? projectId;
    if (!sourceProjectId) {
      setError('Save the project first to export .webster.');
      return;
    }

    setError('');
    setStatus('Exporting WEBSTER from backend...');
    try {
      const exported = await exportProjectFile(sourceProjectId, 'webster');
      const link = document.createElement('a');
      link.download = exported.fileName;
      link.href = URL.createObjectURL(exported.blob);
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus('Exported WEBSTER from backend.');
    } catch (error) {
      setError(getErrorMessage(error, 'Could not export WEBSTER from backend.'));
    }
  };

  const getProjectShareDetails = async (id: string) => getProjectShareDetailsRequest(id);

  const cloneSharedProjectToDrafts = async (slug: string): Promise<ProjectRecord> => {
    if (!canManageSavedProjects) {
      throw new Error('Log in to copy this shared project into Drafts.');
    }
    return cloneSharedProjectRequest(slug);
  };

  return {
    canManageSavedProjects, projectRequestBusy,
    applyProjectFrames, refreshSavedProjects,
    saveProjectToBackend, autosaveProject, openSavedProject, openSharedProject, deleteSavedProject,
    createProjectFromTemplate, createTemplateFromCurrentProject,
    exportProject, exportProjectAsWebster, exportProjectFromBackend, importProject,
    enableProjectShare, disableProjectShare,
    getProjectShareDetails, cloneSharedProjectToDrafts
  };
}
