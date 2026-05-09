import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '../types'
import { authApi } from '../api/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载当前用户
  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        const userData = await authApi.getCurrentUser()
        setUser(userData)
      }
    } catch (err) {
      console.error('加载用户失败:', err)
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
    } catch (err) {
      console.error('登录错误:', err)
      throw err
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await authApi.register({ email, password, full_name: fullName })
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
    } catch (err) {
      console.error('注册错误:', err)
      throw err
    }
  }

  const signOut = async () => {
    try {
      await authApi.logout()
    } catch (err) {
      console.error('登出错误:', err)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
