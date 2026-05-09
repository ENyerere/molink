import { apiGet, apiPost, apiPut, apiDelete } from './client'
import { Page } from '../types'

interface CreatePageData {
  workspace_id: string
  parent_id?: string
  title?: string
  page_type?: string
  icon?: string
}

interface UpdatePageData {
  title?: string
  parent_id?: string
  icon?: string
  cover_image?: string
  is_favorite?: boolean
  is_archived?: boolean
  position?: number
}

export const pagesApi = {
  // 获取页面列表
  list: async (workspaceId: string, parentId?: string, isArchived: boolean = false): Promise<Page[]> => {
    const params: Record<string, any> = {
      workspace_id: workspaceId,
      is_archived: isArchived,
    }
    if (parentId) {
      params.parent_id = parentId
    }
    return apiGet<Page[]>('/pages/', params)  // 添加尾部斜杠避免重定向丢失 Authorization 头
  },

  // 获取单个页面
  get: async (id: string): Promise<Page> => {
    return apiGet<Page>(`/pages/${id}`)
  },

  // 创建页面
  create: async (data: CreatePageData): Promise<Page> => {
    return apiPost<Page>('/pages/', data)  // 添加尾部斜杠避免重定向丢失 Authorization 头
  },

  // 更新页面
  update: async (id: string, data: UpdatePageData): Promise<Page> => {
    return apiPut<Page>(`/pages/${id}`, data)
  },

  // 删除页面
  delete: async (id: string): Promise<void> => {
    await apiDelete(`/pages/${id}`)
  },

  // 获取子页面
  getChildren: async (id: string): Promise<Page[]> => {
    return apiGet<Page[]>(`/pages/${id}/children`)
  },
}
