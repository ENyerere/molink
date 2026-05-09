import { apiGet, apiPost, apiPut, apiDelete } from './client'
import { Workspace } from '../types'

interface CreateWorkspaceData {
  name: string
  icon?: string
}

interface UpdateWorkspaceData {
  name?: string
  icon?: string
  settings?: Record<string, any>
}

export const workspacesApi = {
  // 获取工作空间列表
  list: async (): Promise<Workspace[]> => {
    return apiGet<Workspace[]>('/workspaces/')  // 添加尾部斜杠避免重定向丢失 Authorization 头
  },

  // 获取单个工作空间
  get: async (id: string): Promise<Workspace> => {
    return apiGet<Workspace>(`/workspaces/${id}`)
  },

  // 创建工作空间
  create: async (data: CreateWorkspaceData): Promise<Workspace> => {
    return apiPost<Workspace>('/workspaces/', data)  // 添加尾部斜杠避免重定向丢失 Authorization 头
  },

  // 更新工作空间
  update: async (id: string, data: UpdateWorkspaceData): Promise<Workspace> => {
    return apiPut<Workspace>(`/workspaces/${id}`, data)
  },

  // 删除工作空间
  delete: async (id: string): Promise<void> => {
    await apiDelete(`/workspaces/${id}`)
  },
}
