// 页面导航：当前页面/视图 + 前进后退历史栈
// 纯函数式导航约定：updater 内不调用其他 setState。
// StrictMode 会双调用 updater，混入副作用会导致历史栈状态错乱（如页面被重复压栈）
import { useState, useTransition } from 'react';

export type ViewMode = 'page' | 'home' | 'inbox';

export function usePageNav() {
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>('home');
  const [backStack, setBackStack] = useState<string[]>([]);
  const [forwardStack, setForwardStack] = useState<string[]>([]);

  // 页面切换属于非紧急更新：包 transition，避免编辑器/页树重渲染阻塞输入响应
  const [, startTransition] = useTransition();
  const activatePage = (id: string) => {
    if (id === activePageId && activeView === 'page') return;
    startTransition(() => {
      if (activePageId && activeView === 'page') setBackStack(prev => [...prev, activePageId]);
      setForwardStack([]);
      setActivePageId(id);
      setActiveView('page');
    });
  };

  // 新建页面后的跳转：与 activatePage 有两点有意差异——不包 transition（立即响应）、
  // 无论当前处于哪个视图都把当前页压入后退栈
  const navigateToNew = (id: string) => {
    if (activePageId) setBackStack(prev => [...prev, activePageId]);
    setForwardStack([]);
    setActivePageId(id);
    setActiveView('page');
  };

  const goBack = () => {
    if (backStack.length === 0) return;
    const prevId = backStack[backStack.length - 1];
    if (activePageId) setForwardStack(f => [...f, activePageId]);
    setBackStack(backStack.slice(0, -1));
    setActivePageId(prevId);
  };

  const goForward = () => {
    if (forwardStack.length === 0) return;
    const nextId = forwardStack[forwardStack.length - 1];
    if (activePageId) setBackStack(b => [...b, activePageId]);
    setForwardStack(forwardStack.slice(0, -1));
    setActivePageId(nextId);
  };

  // 页面删除后从历史栈中剔除（只剔除被点删的那一页，与原有行为一致）
  const removeFromHistory = (id: string) => {
    setBackStack(prev => prev.filter(pid => pid !== id));
    setForwardStack(prev => prev.filter(pid => pid !== id));
  };

  // 登出时整体复位
  const reset = () => {
    setActivePageId(null);
    setActiveView('home');
    setBackStack([]);
    setForwardStack([]);
  };

  return {
    activePageId,
    setActivePageId,
    activeView,
    setActiveView,
    backStack,
    forwardStack,
    canGoBack: backStack.length > 0,
    canGoForward: forwardStack.length > 0,
    activatePage,
    navigateToNew,
    goBack,
    goForward,
    removeFromHistory,
    reset,
  };
}

export type PageNav = ReturnType<typeof usePageNav>;
