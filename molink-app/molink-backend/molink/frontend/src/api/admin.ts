/**
 * 管理员 API 模块
 */
import { apiGet, apiPost, apiPut, apiDelete } from './client'
import { User } from '../types'

// 管理员用户接口
export interface AdminUser extends User {
  is_admin?: boolean
}

// 系统统计接口
export interface SystemStats {
  totalUsers: number
  totalPages: number
  totalDatabases: number
  totalFiles: number
  storageUsed: string
  onlineUsers: number
}

// 系统指标接口
export interface SystemMetrics {
  cpu: number
  memory: number
  disk: number
  memoryTotal?: string
  memoryUsed?: string
  diskTotal?: string
  diskUsed?: string
}

// 服务状态接口
export interface ServiceStatus {
  name: string
  status: 'healthy' | 'warning' | 'error'
  uptime: string
  lastCheck: string
  error?: string
}

// 系统健康状态接口
export interface SystemHealth {
  services: ServiceStatus[]
  timestamp: string
}

// 在线用户接口
export interface OnlineUser {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  last_active?: string
}

// 备份信息接口
export interface BackupInfo {
  filename: string
  size: string
  created_at: string
}

// 创建用户请求接口
export interface CreateUserRequest {
  email: string
  password: string
  full_name?: string
  is_admin?: boolean
}

// 更新用户请求接口
export interface UpdateUserRequest {
  email?: string
  full_name?: string
  password?: string
  is_active?: boolean
  is_admin?: boolean
}

/**
 * 获取系统统计数据
 */
export async function getSystemStats(): Promise<SystemStats> {
  return apiGet<SystemStats>('/admin/stats')
}

/**
 * 获取所有用户列表
 */
export async function getAllUsers(params?: {
  skip?: number
  limit?: number
  search?: string
}): Promise<AdminUser[]> {
  return apiGet<AdminUser[]>('/admin/users', params)
}

/**
 * 通过ID获取用户
 */
export async function getUserById(userId: string): Promise<AdminUser> {
  return apiGet<AdminUser>(`/admin/users/${userId}`)
}

/**
 * 管理员创建用户
 */
export async function createUserByAdmin(
  userData: CreateUserRequest
): Promise<AdminUser> {
  const { is_admin, ...data } = userData
  return apiPost<AdminUser>(`/admin/users?is_admin=${is_admin || false}`, data)
}

/**
 * 管理员更新用户
 */
export async function updateUserByAdmin(
  userId: string,
  userData: UpdateUserRequest
): Promise<AdminUser> {
  return apiPut<AdminUser>(`/admin/users/${userId}`, userData)
}

/**
 * 管理员删除用户
 */
export async function deleteUserByAdmin(
  userId: string
): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/admin/users/${userId}`)
}

/**
 * 切换用户启用/禁用状态
 */
export async function toggleUserStatus(
  userId: string
): Promise<{ message: string; is_active: boolean }> {
  return apiPut<{ message: string; is_active: boolean }>(
    `/admin/users/${userId}/toggle-status`
  )
}

/**
 * 切换用户管理员角色
 */
export async function toggleAdminRole(
  userId: string
): Promise<{ message: string; is_admin: boolean }> {
  return apiPut<{ message: string; is_admin: boolean }>(
    `/admin/users/${userId}/toggle-admin`
  )
}

/**
 * 获取系统健康状态
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  return apiGet<SystemHealth>('/admin/system/health')
}

/**
 * 获取系统性能指标
 */
export async function getSystemMetrics(): Promise<SystemMetrics> {
  return apiGet<SystemMetrics>('/admin/system/metrics')
}

/**
 * 获取在线用户列表
 */
export async function getOnlineUsers(): Promise<OnlineUser[]> {
  return apiGet<OnlineUser[]>('/admin/online-users')
}

/**
 * 创建备份
 */
export async function createBackup(): Promise<{
  message: string
  backup_id: string
  status: string
  created_at: string
}> {
  return apiPost<{
    message: string
    backup_id: string
    status: string
    created_at: string
  }>('/admin/backup')
}

/**
 * 获取备份列表
 */
export async function listBackups(): Promise<BackupInfo[]> {
  return apiGet<BackupInfo[]>('/admin/backups')
}
