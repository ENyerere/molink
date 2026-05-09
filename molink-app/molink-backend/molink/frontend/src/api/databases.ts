import { apiGet, apiPost, apiPut, apiDelete } from './client'
import { Database, DatabaseField, DatabaseRecord } from '../types'

// Database API
interface CreateDatabaseData {
  workspace_id: string
  name?: string
  description?: string
  icon?: string
  default_view?: string
}

interface UpdateDatabaseData {
  name?: string
  description?: string
  icon?: string
  default_view?: string
}

export const databasesApi = {
  // 获取数据库列表
  list: async (workspaceId: string): Promise<Database[]> => {
    return apiGet<Database[]>('/databases/', { workspace_id: workspaceId })  // 添加尾部斜杠避免重定向丢失 Authorization 头
  },

  // 获取单个数据库
  get: async (id: string): Promise<Database> => {
    return apiGet<Database>(`/databases/${id}`)
  },

  // 创建数据库
  create: async (data: CreateDatabaseData): Promise<Database> => {
    return apiPost<Database>('/databases/', data)  // 添加尾部斜杠避免重定向丢失 Authorization 头
  },

  // 更新数据库
  update: async (id: string, data: UpdateDatabaseData): Promise<Database> => {
    return apiPut<Database>(`/databases/${id}`, data)
  },

  // 删除数据库
  delete: async (id: string): Promise<void> => {
    await apiDelete(`/databases/${id}`)
  },
}

// Database Fields API
interface CreateFieldData {
  database_id: string
  name?: string
  field_type?: string
  field_config?: Record<string, any>
  position?: number
}

interface UpdateFieldData {
  name?: string
  field_type?: string
  field_config?: Record<string, any>
  position?: number
  is_visible?: boolean
}

export const fieldsApi = {
  // 获取字段列表
  list: async (databaseId: string): Promise<DatabaseField[]> => {
    return apiGet<DatabaseField[]>(`/databases/${databaseId}/fields`)
  },

  // 创建字段
  create: async (databaseId: string, data: CreateFieldData): Promise<DatabaseField> => {
    return apiPost<DatabaseField>(`/databases/${databaseId}/fields`, data)
  },

  // 更新字段
  update: async (fieldId: string, data: UpdateFieldData): Promise<DatabaseField> => {
    return apiPut<DatabaseField>(`/databases/fields/${fieldId}`, data)
  },

  // 删除字段
  delete: async (fieldId: string): Promise<void> => {
    await apiDelete(`/databases/fields/${fieldId}`)
  },
}

// Database Records API
interface CreateRecordData {
  database_id: string
  properties?: Record<string, any>
  position?: number
}

interface UpdateRecordData {
  properties?: Record<string, any>
  position?: number
}

export const recordsApi = {
  // 获取记录列表
  list: async (databaseId: string): Promise<DatabaseRecord[]> => {
    return apiGet<DatabaseRecord[]>(`/databases/${databaseId}/records`)
  },

  // 创建记录
  create: async (databaseId: string, data: CreateRecordData): Promise<DatabaseRecord> => {
    return apiPost<DatabaseRecord>(`/databases/${databaseId}/records`, data)
  },

  // 更新记录
  update: async (recordId: string, data: UpdateRecordData): Promise<DatabaseRecord> => {
    return apiPut<DatabaseRecord>(`/databases/records/${recordId}`, data)
  },

  // 删除记录
  delete: async (recordId: string): Promise<void> => {
    await apiDelete(`/databases/records/${recordId}`)
  },
}
