import { buildApiPath, requestJson } from './http';

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
  createdAt: string;
  updatedAt: string;
};

export function listProjects() {
  return requestJson<ProjectRecord[]>(projectsBasePath, undefined, { auth: true });
}

export function getProject(id: string) {
  return requestJson<ProjectRecord>(`${projectsBasePath}/${id}`, undefined, { auth: true });
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
