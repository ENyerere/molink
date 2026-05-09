import apiClient, { apiGet, apiPost, apiPut, apiDelete } from './client'
import { Block } from '../types'

interface CreateBlockData {
  page_id: string
  parent_block_id?: string
  block_type?: string
  content?: Record<string, any>
  position?: number
}

interface UpdateBlockData {
  block_type?: string
  content?: Record<string, any>
  position?: number
}

export const blocksApi = {
  // 获取页面的所有块
  list: async (pageId: string): Promise<Block[]> => {
    return apiGet<Block[]>('/blocks/', { page_id: pageId })  // 添加尾部斜杠避免重定向丢失 Authorization 头
  },

  // 获取单个块
  get: async (id: string): Promise<Block> => {
    return apiGet<Block>(`/blocks/${id}`)
  },

  // 创建块
  create: async (data: CreateBlockData): Promise<Block> => {
    return apiPost<Block>('/blocks/', data)  // 添加尾部斜杠避免重定向丢失 Authorization 头
  },

  // 更新块
  update: async (id: string, data: UpdateBlockData): Promise<Block> => {
    return apiPut<Block>(`/blocks/${id}`, data)
  },

  // 删除块
  delete: async (id: string): Promise<void> => {
    await apiDelete(`/blocks/${id}`)
  },

  // 重新排序块
  reorder: async (pageId: string, blockIds: string[]): Promise<void> => {
    await apiClient.post(`/blocks/reorder?page_id=${pageId}`, { block_ids: blockIds })
  },
}
