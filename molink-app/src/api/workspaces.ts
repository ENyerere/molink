import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  icon?: string;
  settings?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceData {
  name: string;
  icon?: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  icon?: string;
  settings?: string;
}

export const workspacesApi = {
  list: async (): Promise<Workspace[]> => {
    return apiGet<Workspace[]>('/workspaces/');
  },

  create: async (data: CreateWorkspaceData): Promise<Workspace> => {
    return apiPost<Workspace>('/workspaces/', data);
  },

  get: async (id: string): Promise<Workspace> => {
    return apiGet<Workspace>(`/workspaces/${id}`);
  },

  update: async (id: string, data: UpdateWorkspaceData): Promise<Workspace> => {
    return apiPut<Workspace>(`/workspaces/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiDelete(`/workspaces/${id}`);
  },
};
