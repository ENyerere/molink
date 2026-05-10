import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Editor from './Editor';
import Login from './components/auth/Login';
import { v4 as uuidv4 } from 'uuid';
import type { Descendant, Element } from 'slate';
import { ChevronLeft, ChevronRight, Share2, Star, MoreHorizontal, Lock } from 'lucide-react';

export interface PageData {
  id: string;
  title: string;
  content: Descendant[];
  cover?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// ==========================================
// 开发配置：控制登录弹窗频率
// ==========================================
const DEV_ALWAYS_SHOW_LOGIN = true;

function shouldShowLoginPrompt(): boolean {
  if (DEV_ALWAYS_SHOW_LOGIN) return true;
  const lastPrompt = localStorage.getItem('molink:lastLoginPrompt');
  const today = new Date().toDateString();
  return lastPrompt !== today;
}

function markLoginPromptShown(): void {
  localStorage.setItem('molink:lastLoginPrompt', new Date().toDateString());
}

export default function App() {
  const [pages, setPages] = useState<PageData[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [backStack, setBackStack] = useState<string[]>([]);
  const [forwardStack, setForwardStack] = useState<string[]>([]);

  // 页面迁移确认对话框状态
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [guestPageCount, setGuestPageCount] = useState(0);

  // 初始化：加载数据 + 未登录弹窗
  useEffect(() => {
    const saved = localStorage.getItem('molink-pages');
    if (saved) {
      const parsed: PageData[] = JSON.parse(saved);
      if (parsed.length) {
        setPages(parsed);
        setActivePageId(parsed[0].id);
      } else {
        addPage();
      }
    } else {
      addPage();
    }

    if (!user && shouldShowLoginPrompt()) {
      setShowLogin(true);
      markLoginPromptShown();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 数据持久化
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('molink-pages', JSON.stringify(pages));
    }, 300);
    return () => clearTimeout(timeout);
  }, [pages]);

  // 监听登录事件
  useEffect(() => {
    const handleLogin = () => setShowLogin(true);
    window.addEventListener('molink:login', handleLogin);
    return () => window.removeEventListener('molink:login', handleLogin);
  }, []);

  const addPage = () => {
    const id = uuidv4();
    const newPage: PageData = {
      id,
      title: '',
      content: [
        { type: 'paragraph', children: [{ text: '' }] } as Element
      ],
    };
    setPages(prev => [...prev, newPage]);
    if (activePageId) setBackStack(prev => [...prev, activePageId]);
    setForwardStack([]);
    setActivePageId(id);
  };

  const activatePage = (id: string) => {
    if (id === activePageId) return;
    if (activePageId) setBackStack(prev => [...prev, activePageId]);
    setForwardStack([]);
    setActivePageId(id);
  };

  const closePage = (id: string) => {
    setPages(prev => {
      const newPages = prev.filter(p => p.id !== id);
      if (id === activePageId) {
        const idx = prev.findIndex(p => p.id === id);
        const nextActive = newPages[idx] || newPages[idx - 1] || null;
        setActivePageId(nextActive?.id || null);
      }
      return newPages;
    });
    setBackStack(prev => prev.filter(pid => pid !== id));
    setForwardStack(prev => prev.filter(pid => pid !== id));
  };

  const goBack = () => {
    setBackStack(prev => {
      if (prev.length === 0) return prev;
      const nextBack = [...prev];
      const prevId = nextBack.pop()!;
      if (activePageId) setForwardStack(f => [...f, activePageId]);
      setActivePageId(prevId);
      return nextBack;
    });
  };

  const goForward = () => {
    setForwardStack(prev => {
      if (prev.length === 0) return prev;
      const nextForward = [...prev];
      const nextId = nextForward.pop()!;
      if (activePageId) setBackStack(b => [...b, activePageId]);
      setActivePageId(nextId);
      return nextForward;
    });
  };

  const canGoBack = backStack.length > 0;
  const canGoForward = forwardStack.length > 0;

  const updatePage = (id: string, newData: Partial<PageData>) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...newData } : p));
  };

  const activePage = pages.find(p => p.id === activePageId);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        pages={pages}
        activePageId={activePageId}
        setActivePageId={setActivePageId}
        addPage={addPage}
        user={user}
        onShowLogin={() => setShowLogin(true)}
      />

      {/* 登录弹窗 */}
      {!user && showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onLogin={(loggedInUser: User) => {
            setUser(loggedInUser);
            setShowLogin(false);
            const saved = localStorage.getItem('molink-pages');
            if (saved) {
              const parsed: PageData[] = JSON.parse(saved);
              const meaningfulPages = parsed.filter(p => {
                const hasTitle = p.title && p.title.trim().length > 0;
                const hasContent = p.content.length > 1 || (p.content[0] as Element)?.children?.[0]?.text !== '';
                return hasTitle || hasContent;
              });
              if (meaningfulPages.length > 0) {
                setGuestPageCount(meaningfulPages.length);
                setShowMigrationDialog(true);
              }
            }
          }}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ===== 顶部标题栏（仿 Notion） ===== */}
        <div className="h-11 flex items-center justify-between px-4 bg-background flex-shrink-0">
          {/* 左侧：前进后退 + 面包屑 */}
          <div className="flex items-center gap-1">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className={`p-1 rounded-md transition-colors ${!canGoBack ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent text-muted-foreground'}`}
              title="后退"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goForward}
              disabled={!canGoForward}
              className={`p-1 rounded-md transition-colors ${!canGoForward ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent text-muted-foreground'}`}
              title="前进"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* 页面标题面包屑 */}
            {activePage && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                  {activePage.title || '无标题'}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  私人
                </span>
              </div>
            )}
          </div>

          {/* 右侧：功能按钮 */}
          <div className="flex items-center gap-1">
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-secondary-foreground hover:bg-accent rounded-md transition-colors">
              <Share2 className="w-4 h-4" />
              <span>分享</span>
            </button>
            <button className="p-1.5 text-muted-foreground hover:bg-accent rounded-md transition-colors">
              <Star className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-muted-foreground hover:bg-accent rounded-md transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 编辑区 */}
        <div className="flex-1 overflow-auto">
          {activePageId && activePage && (
            <Editor
              page={activePage}
              updatePage={updatePage}
            />
          )}
        </div>
      </div>

      {/* 页面迁移确认对话框 */}
      {showMigrationDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-card rounded-xl w-full max-w-[420px] shadow-2xl p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-card-foreground text-center mb-2">
              保留未登录时的页面？
            </h3>

            <p className="text-muted-foreground text-[15px] text-center mb-6 leading-relaxed">
              你在未登录状态下创建了 <span className="font-semibold text-card-foreground">{guestPageCount}</span> 个页面，
              是否将它们保留到你的个人空间中？
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowMigrationDialog(false);
                  setGuestPageCount(0);
                }}
                className="w-full h-11 bg-primary text-primary-foreground text-[15px] font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                保留页面
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem('molink-pages');
                  setPages([]);
                  setActivePageId(null);
                  setShowMigrationDialog(false);
                  setGuestPageCount(0);
                  setTimeout(() => addPage(), 0);
                }}
                className="w-full h-11 border border-border text-secondary-foreground text-[15px] font-medium rounded-lg hover:bg-accent transition-colors"
              >
                不保留，重新开始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
