import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { STORAGE_KEYS } from '../lib/storage';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark'; // 实际应用的主题（system 会解析为当前系统主题）
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = STORAGE_KEYS.theme;

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// 纯函数：只解析主题，不触碰 DOM，可在渲染期（useState initializer）安全调用
function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);

  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return saved || 'system';
  });

  // 初始值只能是纯计算：applyTheme 含 classList DOM 副作用，不允许在渲染期执行，
  // 这里只解析出初始 resolvedTheme，DOM 应用交给下方的挂载 effect
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    return resolveTheme(theme);
  });

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    setThemeState(newTheme);
    setResolvedTheme(applyTheme(newTheme));
  }, []);

  // 监听系统主题变化（仅在 system 模式下生效）
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        setResolvedTheme(applyTheme('system'));
      }
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  // 初始化时应用主题
  useEffect(() => {
    setResolvedTheme(applyTheme(theme));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // value memo 化：theme/resolvedTheme 不变时 consumer 不因 Provider 重渲染而重渲染
  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
