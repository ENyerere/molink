import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type BlockType =
  | 'text'
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'ul' | 'ol'
  | 'image' | 'code' | 'quote' | 'table';

export interface BackendBlock {
  id: string;
  page_id: string;
  parent_block_id?: string;
  block_type: BlockType;
  content: Record<string, any>;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBlockData {
  page_id: string;
  parent_block_id?: string;
  block_type?: BlockType;
  content?: Record<string, any>;
  position?: number;
}

export interface UpdateBlockData {
  block_type?: BlockType;
  content?: Record<string, any>;
  position?: number;
}

export const blocksApi = {
  list: async (pageId: string): Promise<BackendBlock[]> => {
    return apiGet<BackendBlock[]>('/blocks/', { page_id: pageId });
  },

  create: async (data: CreateBlockData): Promise<BackendBlock> => {
    return apiPost<BackendBlock>('/blocks/', data);
  },

  update: async (id: string, data: UpdateBlockData): Promise<BackendBlock> => {
    return apiPut<BackendBlock>(`/blocks/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiDelete(`/blocks/${id}`);
  },
};
