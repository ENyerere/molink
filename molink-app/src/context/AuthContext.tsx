import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { authApi } from '../api';
import type { BackendUser } from '../api';

interface AuthContextType {
  user: BackendUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载当前用户
  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('加载用户失败:', err);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  // StrictMode 下挂载 effect 会执行两次，用 ref 守卫保证初始会话恢复请求只发一次；
  // OAuth 回调路径也会调用 loadUser，同样置位，避免与初始 effect 重复请求
  const initStartedRef = useRef(false);

  // 处理 OAuth 回调（URL hash 中的 token）
  useEffect(() => {
    const handleOAuthCallback = () => {
      const hash = window.location.hash;
      if (hash.includes('token=')) {
        const queryPart = hash.split('?')[1];
        if (queryPart) {
          const params = new URLSearchParams(queryPart);
          const token = params.get('token');
          if (token) {
            localStorage.setItem('access_token', token);
            window.location.hash = '';
            initStartedRef.current = true;
            loadUser();
          }
        }
      }
    };

    handleOAuthCallback();
    window.addEventListener('hashchange', handleOAuthCallback);
    return () => window.removeEventListener('hashchange', handleOAuthCallback);
  }, [loadUser]);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    loadUser();
  }, [loadUser]);

  // 监听认证过期事件
  useEffect(() => {
    const handler = () => {
      setUser(null);
    };
    window.addEventListener('molink:auth_expired', handler);
    return () => window.removeEventListener('molink:auth_expired', handler);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const response = await authApi.register({ email, password, full_name: fullName });
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('登出错误:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  // 函数均已 useCallback 稳定化，value 整体 memo，避免 consumer 无谓重渲染
  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
