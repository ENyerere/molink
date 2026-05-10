import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface BackendPage {
  id: string;
  workspace_id: string;
  parent_id?: string;
  title: string;
  page_type: 'page' | 'database';
  icon?: string;
  cover_image?: string;
  is_favorite: boolean;
  is_archived: boolean;
  position: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePageData {
  workspace_id: string;
  parent_id?: string;
  title?: string;
  page_type?: string;
  icon?: string;
}

export interface UpdatePageData {
  title?: string;
  parent_id?: string;
  icon?: string;
  cover_image?: string;
  is_favorite?: boolean;
  is_archived?: boolean;
  position?: number;
}

export const pagesApi = {
  list: async (workspaceId: string, parentId?: string, isArchived: boolean = false): Promise<BackendPage[]> => {
    const params: Record<string, any> = {
      workspace_id: workspaceId,
      is_archived: isArchived,
    };
    if (parentId) {
      params.parent_id = parentId;
    }
    return apiGet<BackendPage[]>('/pages/', params);
  },

  get: async (id: string): Promise<BackendPage> => {
    return apiGet<BackendPage>(`/pages/${id}`);
  },

  create: async (data: CreatePageData): Promise<BackendPage> => {
    return apiPost<BackendPage>('/pages/', data);
  },

  update: async (id: string, data: UpdatePageData): Promise<BackendPage> => {
    return apiPut<BackendPage>(`/pages/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiDelete(`/pages/${id}`);
  },

  getChildren: async (id: string): Promise<BackendPage[]> => {
    return apiGet<BackendPage[]>(`/pages/${id}/children`);
  },
};
