export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  is_active: boolean
  is_admin?: boolean
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  owner_id: string
  icon?: string
  settings?: string
  created_at: string
  updated_at: string
}

export interface Page {
  id: string
  workspace_id: string
  parent_id?: string
  title: string
  page_type: 'page' | 'database'
  icon?: string
  cover_image?: string
  is_favorite: boolean
  is_archived: boolean
  position: number
  created_by?: string
  created_at: string
  updated_at: string
}

export type BlockType = 
  | 'text' 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'h6'
  | 'ul' 
  | 'ol' 
  | 'image' 
  | 'code' 
  | 'quote'
  | 'table'

export interface Block {
  id: string
  page_id: string
  parent_block_id?: string
  block_type: BlockType
  content: Record<string, any>
  position: number
  created_at: string
  updated_at: string
}

export interface Database {
  id: string
  workspace_id: string
  page_id?: string
  name: string
  icon?: string
  description?: string
  default_view: 'table' | 'board' | 'calendar'
  created_by?: string
  created_at: string
  updated_at: string
}

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'select' 
  | 'multiselect' 
  | 'checkbox'
  | 'url'
  | 'email'
  | 'file'

export interface DatabaseField {
  id: string
  database_id: string
  name: string
  field_type: FieldType
  field_config: Record<string, any>
  position: number
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseRecord {
  id: string
  database_id: string
  properties: Record<string, any>
  position: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface FileRecord {
  id: string
  name: string
  original_name: string
  url: string
  file_type?: string
  mime_type?: string
  size?: number
  user_id: string
  created_at: string
}

export interface AuthToken {
  access_token: string
  token_type: string
  user: User
}
