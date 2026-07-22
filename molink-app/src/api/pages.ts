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
  deleted_at?: string;
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
  cover_image?: string;
}

export interface UpdatePageData {
  title?: string;
  parent_id?: string;
  // icon / cover_image 传 null 表示置空（后端 update 用 exclude_unset，显式 null 会写入）
  icon?: string | null;
  cover_image?: string | null;
  cover_position?: number;
  is_favorite?: boolean;
  is_archived?: boolean;
  deleted_at?: string | null;
  position?: number;
}

export const pagesApi = {
  list: async (workspaceId: string, parentId?: string, isArchived: boolean = false): Promise<BackendPage[]> => {
    const params: Record<string, unknown> = {
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

  restore: async (id: string): Promise<BackendPage> => {
    return apiPost<BackendPage>(`/pages/${id}/restore`, {});
  },

  permanentDelete: async (id: string): Promise<void> => {
    await apiDelete(`/pages/${id}/permanent`);
  },

  trash: async (workspaceId: string): Promise<BackendPage[]> => {
    return apiGet<BackendPage[]>('/pages/trash/list', { workspace_id: workspaceId });
  },

  getChildren: async (id: string): Promise<BackendPage[]> => {
    return apiGet<BackendPage[]>(`/pages/${id}/children`);
  },
};
