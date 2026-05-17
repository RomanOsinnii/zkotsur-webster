import { buildApiPath, requestJson } from './http';

const templatesBasePath = buildApiPath('/api/templates');

export type TemplateRecord = {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  data?: Record<string, unknown> | null;
};

export type CreateTemplatePayload = {
  name: string;
  category: string;
  width: number;
  height: number;
  data?: Record<string, unknown>;
};

export type UpdateTemplatePayload = Partial<{
  name: string;
  category: string;
  width: number;
  height: number;
  data: Record<string, unknown>;
}>;

export function listTemplates() {
  return requestJson<TemplateRecord[]>(templatesBasePath);
}

export function updateTemplate(id: string, payload: UpdateTemplatePayload) {
  return requestJson<TemplateRecord>(`${templatesBasePath}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }, { auth: true });
}

export function createTemplate(payload: CreateTemplatePayload) {
  return requestJson<TemplateRecord>(templatesBasePath, {
    method: 'POST',
    body: JSON.stringify(payload)
  }, { auth: true });
}

export function deleteTemplate(id: string) {
  return requestJson<void>(`${templatesBasePath}/${id}`, {
    method: 'DELETE'
  }, { auth: true });
}
