import { buildApiPath, getAccessToken, requestJson } from './http';

const projectsBasePath = buildApiPath('/api/projects');

export type ProjectPayload = {
  name: string;
  description?: string;
  data: Record<string, unknown>;
};

export type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  data: Record<string, unknown>;
  isPublic: boolean;
  shareSlug: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectShareRecord = {
  isPublic: boolean;
  shareSlug: string | null;
  sharePath: string | null;
};

export type ProjectShareDetailsRecord = ProjectShareRecord & {
  visitors: { username: string; visitedAt: string }[];
};

export type PublicProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  data: Record<string, unknown>;
  shareSlug: string;
  readOnly: true;
  updatedAt: string;
};

export type ProjectExportFormat = 'json' | 'png' | 'pdf';

export type ExportedProjectFile = {
  blob: Blob;
  fileName: string;
};

export function listProjects() {
  return requestJson<ProjectRecord[]>(projectsBasePath, undefined, { auth: true });
}

export function getProject(id: string) {
  return requestJson<ProjectRecord>(`${projectsBasePath}/${id}`, undefined, { auth: true });
}

export function listRecentProjects() {
  return requestJson<ProjectRecord[]>(`${projectsBasePath}/recent`, undefined, { auth: true });
}

export function createProject(payload: ProjectPayload) {
  return requestJson<ProjectRecord>(projectsBasePath, {
    method: 'POST',
    body: JSON.stringify(payload)
  }, { auth: true });
}

export function updateProject(id: string, payload: ProjectPayload) {
  return requestJson<ProjectRecord>(`${projectsBasePath}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }, { auth: true });
}

export function deleteProject(id: string) {
  return requestJson<void>(`${projectsBasePath}/${id}`, {
    method: 'DELETE'
  }, { auth: true });
}

export function enableProjectShare(id: string) {
  return requestJson<ProjectShareRecord>(`${projectsBasePath}/${id}/share`, {
    method: 'POST'
  }, { auth: true });
}

export function disableProjectShare(id: string) {
  return requestJson<void>(`${projectsBasePath}/${id}/share`, {
    method: 'DELETE'
  }, { auth: true });
}

export function getProjectShareDetails(id: string) {
  return requestJson<ProjectShareDetailsRecord>(`${projectsBasePath}/${id}/share`, undefined, { auth: true });
}

export function getSharedProject(slug: string, viewer?: string) {
  const query = viewer?.trim() ? `?viewer=${encodeURIComponent(viewer.trim())}` : '';
  return requestJson<PublicProjectRecord>(`${projectsBasePath}/shared/${slug}${query}`);
}

export function cloneSharedProject(slug: string) {
  return requestJson<ProjectRecord>(`${projectsBasePath}/shared/${slug}/clone`, { method: 'POST' }, { auth: true });
}

export async function exportProjectFile(id: string, format: ProjectExportFormat): Promise<ExportedProjectFile> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${projectsBasePath}/${id}/export/${format}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    try {
      const payload = await response.json() as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (typeof payload.message === 'string' && payload.message.trim()) {
        message = payload.message;
      }
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  const contentDisposition = response.headers.get('Content-Disposition') ?? '';
  const fileNameMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
  const fileName = fileNameMatch?.[1] ?? `webster-project.${format}`;

  return {
    blob: await response.blob(),
    fileName
  };
}
