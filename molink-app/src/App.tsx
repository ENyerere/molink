// App 编排层：组装 hooks（导航 / 保存队列 / 活动日志 / 页面数据）、持有外壳 UI 状态、渲染视图树
// 页面数据与同步逻辑已迁至 hooks/usePages.ts；localStorage/转换等纯函数在 lib/
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import Sidebar from './Sidebar';
import LoadingScreen from './components/LoadingScreen';
// 重组件按需加载：首屏只拉取当前视图所需 chunk，其余在切换到对应视图时再加载
// （Sidebar/Topbar/LoadingScreen 首屏工作区必渲染，保持静态 import）
const Editor = lazy(() => import('./Editor'));
const Login = lazy(() => import('./components/auth/Login'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SearchModal = lazy(() => import('./components/SearchModal'));
const HomeView = lazy(() => import('./components/HomeView'));
const WorkspacePanel = lazy(() => import('./components/WorkspacePanel'));
const InboxView = lazy(() => import('./components/InboxView'));
import { useAuth } from './context/AuthContext';
import { AnimatePresence, motion } from 'motion/react';
import AnimatedPresence from './components/AnimatedPresence';
import Topbar, { type SaveIndicatorState } from './components/Topbar';
import { Button } from './components/ui';
import { usePageNav } from './hooks/usePageNav';
import { useContentSaver } from './hooks/useContentSaver';
import { useActivities } from './hooks/useActivities';
import { usePages } from './hooks/usePages';
import { STORAGE_KEYS } from './lib/storage';
import type { PageData, User, Activity } from './types';

// 类型统一定义在 types/，这里 re-export 保持各消费方（Sidebar/HomeView/Editor 等）的
// `from './App'` 引用路径不变
export type { PageData, User, Activity };

// 懒加载占位：轻量居中 spinner。不要用 LoadingScreen——它有自己的进度计时逻辑，
// 作为 Suspense fallback 会反复触发计时与 onFinish 副作用
function LazyFallback({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={`flex items-center justify-center bg-background ${fullScreen ? 'h-screen w-full' : 'h-full w-full'}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading } = useAuth();

  // 外壳 UI 状态（landing/工作区切换、弹窗、首屏加载）
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);

  // 宽版内容列开关（持久化到 localStorage）
  const [wideMode, setWideMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.wideMode) === '1';
    } catch {
      return false;
    }
  });
  const toggleWideMode = useCallback(() => {
    setWideMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.wideMode, next ? '1' : '0');
      } catch {
        // localStorage 不可用时仅保持会话内生效
      }
      return next;
    });
  }, []);

  // 领域 hooks：导航 → 保存队列（监听页面切换 flush）→ 活动日志 → 页面数据
  const nav = usePageNav();
  const saver = useContentSaver(nav.activePageId);
  const activitiesApi = useActivities(user);
  const {
    pages,
    workspace,
    apiLoading,
    pageIndexes,
    addPage,
    closePage,
    restorePage,
    permanentDeletePage,
    updatePage,
    uploadCover,
    loadGuestPages,
    showMigrationDialog,
    guestPageCount,
    migrateLocalPages,
    discardLocalPages,
  } = usePages({
    user,
    authLoading,
    nav,
    saver,
    activitiesApi,
    setShowWorkspace,
  });

  const { activePageId, activeView } = nav;
  const { byId: pagesById, childrenByParent } = pageIndexes;

  // ==========================================
  // 全局快捷键
  // ==========================================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // 编辑器内 Ctrl+K 是"插入链接"快捷键，不抢去开搜索弹窗
        const target = e.target as HTMLElement | null;
        if (target?.closest?.('[data-slate-editor="true"]')) return;
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLoginSuccess = () => {
    setShowLogin(false);
    nav.setActiveView('home');
    // 本地页面迁移检查已移至登录状态切换 effect（usePages），弹窗与 OAuth 登录都会触发
  };

  const activePage = activePageId ? pagesById.get(activePageId) : undefined;

  // 页面视图下激活页已不存在（被永久删除/加载后失效）时回退到主页，避免内容区空白、面包屑残留。
  // 注意：回收站中的页面仍允许打开（编辑器有"已移至回收站"横幅），不在此列
  useEffect(() => {
    if (activeView === 'page' && (!activePageId || !activePage)) {
      nav.setActiveView('home');
    }
  }, [activeView, activePageId, activePage, nav]);

  // 计算面包屑路径（沿 parentId 链走 pagesById 直查；visited 防御脏数据成环导致死循环）
  const breadcrumbPath = useMemo(() => {
    if (!activePage) return [];
    const path: PageData[] = [];
    const visited = new Set<string>();
    let current: PageData | undefined = activePage;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift(current);
      if (!current.parentId) break;
      current = pagesById.get(current.parentId);
    }
    return path;
  }, [activePage, pagesById]);

  // 顶栏只展示当前活动页的保存状态；其他页面或视图视为 idle
  const saveIndicator = saver.saveIndicator;
  const topbarSaveIndicator: SaveIndicatorState =
    activeView === 'page' && saveIndicator && saveIndicator.pageId === activePageId
      ? { status: saveIndicator.status, savedAt: saveIndicator.savedAt }
      : { status: 'idle' };

  // 当前页面的子页面（包含已删除的，用于 page-link 块渲染）
  // childrenByParent 按 pages 顺序插入，与 filter 的结果顺序一致
  const childPages = useMemo(() => {
    if (!activePageId) return [];
    return childrenByParent.get(activePageId) ?? [];
  }, [childrenByParent, activePageId]);

  if (!loadingDone) {
    return <LoadingScreen onFinish={() => setLoadingDone(true)} />;
  }

  if (authLoading || apiLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">加载中...</span>
      </div>
    );
  }

  const isLanding = !user && !showWorkspace;

  return (
    <motion.div
      className={`relative w-full bg-background ${!isLanding ? 'h-screen overflow-hidden' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <AnimatePresence mode="wait">
        {isLanding ? (
          <motion.div
            key="landing"
            className="z-20"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <Suspense fallback={<LazyFallback fullScreen />}>
              <LandingPage
                onEnterWorkspace={() => {
                  setShowWorkspace(true);
                  loadGuestPages();
                }}
                onLogin={() => setShowLogin(true)}
              />
            </Suspense>
            {/* 弹窗类组件初始不可见，fallback 用 null 即可 */}
            <Suspense fallback={null}>
              <Login
                isOpen={showLogin}
                onClose={() => setShowLogin(false)}
                onLogin={handleLoginSuccess}
              />
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            className="fixed inset-0 z-10 flex h-full w-full"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Sidebar
              pages={pages}
              activePageId={activePageId}
              setActivePageId={nav.activatePage}
              addPage={addPage}
              closePage={closePage}
              restorePage={restorePage}
              permanentDeletePage={permanentDeletePage}
              user={user ? { id: user.id, name: user.full_name || user.email.split('@')[0], email: user.email, avatar: user.avatar_url || undefined } : null}
              onShowLogin={() => setShowLogin(true)}
              activeView={activeView}
              onSetView={nav.setActiveView}
              onShowSearch={() => setShowSearch(true)}
              onShowWorkspace={() => setShowWorkspacePanel(true)}
            />

      {/* 登录弹窗（初始不可见，fallback 用 null） */}
      <Suspense fallback={null}>
        <Login
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onLogin={handleLoginSuccess}
        />
      </Suspense>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题栏（抽取为独立组件，见 components/Topbar.tsx） */}
        <Topbar
          activeView={activeView}
          breadcrumbPath={breadcrumbPath}
          onNavigatePage={nav.setActivePageId}
          canGoBack={nav.canGoBack}
          canGoForward={nav.canGoForward}
          onGoBack={nav.goBack}
          onGoForward={nav.goForward}
          saveIndicator={topbarSaveIndicator}
          isGuest={!user}
          wideMode={wideMode}
          onToggleWide={toggleWideMode}
          activePage={activePage}
          allPages={pages}
        />

        {/* 编辑区 / 主页 / 收件箱（懒加载共用一个轻量 spinner 占位） */}
        <div className="flex-1 overflow-auto bg-background">
          <Suspense fallback={<LazyFallback />}>
            {activeView === 'page' && activePageId && activePage && (
              <Editor
                page={activePage}
                childPages={childPages}
                updatePage={updatePage}
                uploadCover={uploadCover}
                onActivatePage={nav.activatePage}
                restorePage={restorePage}
                permanentDeletePage={permanentDeletePage}
                wideMode={wideMode}
              />
            )}
            {activeView === 'home' && (
              <HomeView pages={pages} onNavigate={nav.activatePage} onCreatePage={() => addPage()} />
            )}
            {activeView === 'inbox' && (
              <InboxView
                activities={activitiesApi.activities}
                onNavigate={nav.activatePage}
              />
            )}
          </Suspense>
        </div>
      </div>

      {/* 弹窗类组件初始不可见，fallback 用 null */}
      <Suspense fallback={null}>
        {/* 搜索弹窗 */}
        <SearchModal
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          pages={pages}
          onNavigate={(id) => {
            nav.activatePage(id);
            setShowSearch(false);
          }}
        />

        {/* 工作空间面板 */}
        <WorkspacePanel
          isOpen={showWorkspacePanel}
          onClose={() => setShowWorkspacePanel(false)}
          workspace={workspace}
          pageCount={pages.length}
          userName={user?.full_name || user?.email.split('@')[0]}
        />
      </Suspense>

      {/* 页面迁移确认对话框 */}
      <AnimatedPresence
        show={showMigrationDialog}
        duration={200}
        enterFrom="opacity-0 backdrop-blur-[0px] bg-black/0"
        enterTo="opacity-100 backdrop-blur-sm bg-black/60"
        className="fixed inset-0 z-modal flex items-center justify-center"
      >
        <div
          className="bg-card rounded-xl w-full max-w-[420px] shadow-2xl p-8 transition-all duration-200 ease-out"
          style={{
            opacity: showMigrationDialog ? 1 : 0,
            transform: showMigrationDialog ? 'scale(1)' : 'scale(0.95)',
          }}
        >
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
            <p className="text-muted-foreground text-dialog text-center mb-6 leading-relaxed">
              你在未登录状态下创建了 <span className="font-semibold text-card-foreground">{guestPageCount}</span> 个页面，
              是否将它们迁移到云端？
            </p>
            <div className="space-y-3">
              <Button onClick={migrateLocalPages} size="lg" className="w-full text-dialog">
                迁移到云端
              </Button>
              <Button
                onClick={discardLocalPages}
                variant="outline"
                size="lg"
                className="w-full bg-transparent text-secondary-foreground text-dialog"
              >
                不保留，重新开始
              </Button>
            </div>
          </div>
      </AnimatedPresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
