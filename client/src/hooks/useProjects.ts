import { Dispatch, MutableRefObject, SetStateAction, ChangeEvent } from 'react';
import {
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  exportProjectFile,
  getProject,
  listProjects,
  updateProject as updateProjectRequest,
  type ProjectExportFormat,
  type ProjectPayload,
  type ProjectRecord
} from '../api/projects';
import { type AuthUser } from '../api/auth';
import { createTemplate as createTemplateRequest } from '../api/templates';
import { clearAccessToken, getAccessToken } from '../api/http';
import { CornerHandle, DesignFrame, FrameHistory, GalleryTemplate, LayerItem, ResizeHandle, WebsterObject, createId } from '../lib/editorTypes';
import {
  createDefaultGradientStops,
  createEditorProjectSnapshot,
  deriveProjectName,
  getErrorMessage,
  parseEditorProjectData
} from '../lib/editorHelpers';
import { createWebsterBinaryFile, parseWebsterBinaryFile } from '../lib/projectBinary';

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
  saveCurrentFrame, openEditorWorkspace
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
    return {
      name: projectName.trim(),
      description: projectDescription.trim() || undefined,
      data: createEditorProjectSnapshot(framesRef.current) as Record<string, unknown>
    };
  };

  const saveProjectToBackend = async (mode: 'save' | 'save-as-new') => {
    if (!canManageSavedProjects) { setProjectError('Log in to save projects to the backend.'); return; }
    if (projectRequestBusy) return;
    if (!projectName.trim()) {
      setProjectError('Project name is required before saving.');
      setProjectStatus('');
      return;
    }
    setIsSavingProject(true);
    setProjectError('');
    setProjectStatus(mode === 'save' && projectId ? 'Saving project changes...' : 'Saving project to backend...');
    try {
      const payload = buildProjectPayload();
      const response = mode === 'save' && projectId
        ? await updateProjectRequest(projectId, payload)
        : await createProjectRequest(payload);
      setProjectId(response.id);
      setProjectName(response.name);
      setProjectDescription(response.description ?? '');
      setProjectStatus(mode === 'save' && projectId ? 'Project saved.' : 'New project saved.');
      await refreshSavedProjects(true);
    } catch (error) {
      const message = getErrorMessage(error, 'Could not save the project.');
      if (!handleUnauthorizedProjectAccess(message)) setProjectError(message);
    } finally {
      setIsSavingProject(false);
    }
  };

  const openSavedProject = async (id: string) => {
    if (!canManageSavedProjects) { setProjectError('Log in to open saved projects.'); return; }
    if (projectRequestBusy) return;
    setOpeningProjectId(id);
    setProjectError('');
    setProjectStatus('Loading saved project...');
    try {
      const project = await getProject(id);
      const nextFrames = parseEditorProjectData(project.data);
      if (!nextFrames) throw new Error('Saved project data is invalid or corrupted.');
      applyProjectFrames(nextFrames, { projectId: project.id, name: project.name, description: project.description });
      setProjectStatus(`Loaded "${project.name}".`);
      await refreshSavedProjects(true);
    } catch (error) {
      const message = getErrorMessage(error, 'Could not open the saved project.');
      if (!handleUnauthorizedProjectAccess(message)) setProjectError(message);
    } finally {
      setOpeningProjectId(null);
    }
  };

  const deleteSavedProject = async (id: string) => {
    if (!canManageSavedProjects) { setProjectError('Log in to delete saved projects.'); return; }
    if (projectRequestBusy) return;
    const target = savedProjects.find((p) => p.id === id);
    const label = target?.name ?? 'this project';
    if (!window.confirm(`Delete "${label}" from saved projects? This cannot be undone.`)) return;
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
    } catch (error) {
      const message = getErrorMessage(error, 'Could not delete the saved project.');
      if (!handleUnauthorizedProjectAccess(message)) setProjectError(message);
    } finally {
      setDeletingProjectId(null);
    }
  };

  const createProjectFromTemplate = (template: GalleryTemplate) => {
    if (template.templateData) {
      const parsedFrames = parseEditorProjectData(template.templateData);
      if (parsedFrames) {
        applyProjectFrames(parsedFrames, { projectId: null, name: template.title, description: template.subtitle });
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
    saveCurrentFrame();
    try {
      const blob = await createWebsterBinaryFile(framesRef.current);
      const link = document.createElement('a');
      link.download = 'webster-project.webster';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus('Project exported as .webster binary file.');
    } catch (error) {
      setError(getErrorMessage(error, 'Could not export the .webster binary file.'));
    }
  };

  const exportProjectFromBackend = async (
    format: ProjectExportFormat,
    setStatus: (s: string) => void,
    setError: (s: string) => void
  ) => {
    if (!canManageSavedProjects) {
      setError('Log in to export project files from backend.');
      return;
    }
    if (!projectId) {
      setError('Save the project first to use server-side export.');
      return;
    }

    setError('');
    setStatus(`Exporting ${format.toUpperCase()} from backend...`);

    try {
      const exported = await exportProjectFile(projectId, format);
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

  const importProject = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setProjectError('');
      setProjectStatus('');
      try {
        if (!(reader.result instanceof ArrayBuffer)) throw new Error('Imported file could not be read.');
        const project = await parseWebsterBinaryFile(reader.result);
        const nextFrames = parseEditorProjectData(project);
        if (!nextFrames) throw new Error('Project binary data is invalid or corrupted.');
        applyProjectFrames(nextFrames, { projectId: null, name: deriveProjectName(nextFrames), description: '' });
        setProjectStatus('Project imported from .webster binary file.');
      } catch (error) {
        setProjectError(getErrorMessage(error, 'Could not import the .webster binary file.'));
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  return {
    canManageSavedProjects, projectRequestBusy,
    applyProjectFrames, refreshSavedProjects,
    saveProjectToBackend, openSavedProject, deleteSavedProject,
    createProjectFromTemplate, createTemplateFromCurrentProject,
    exportProject, exportProjectFromBackend, importProject
  };
}
