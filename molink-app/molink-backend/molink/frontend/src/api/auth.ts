import { apiPost, apiGet } from './client'
import { AuthToken, User } from '../types'

interface LoginData {
  email: string
  password: string
}

interface RegisterData {
  email: string
  password: string
  full_name?: string
}

export const authApi = {
  // 用户登录
  login: async (data: LoginData): Promise<AuthToken> => {
    return apiPost<AuthToken>('/auth/login', data)
  },

  // 用户注册
  register: async (data: RegisterData): Promise<AuthToken> => {
    return apiPost<AuthToken>('/auth/register', data)
  },

  // 登出
  logout: async (): Promise<void> => {
    await apiPost('/auth/logout')
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<User> => {
    return apiGet<User>('/auth/me')
  },
}
