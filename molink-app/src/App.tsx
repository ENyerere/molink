import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from './Sidebar';
import Editor from './Editor';
import Login from './components/auth/Login';
import LandingPage from './pages/LandingPage';
import LoadingScreen from './components/LoadingScreen';
import SearchModal from './components/SearchModal';
import HomeView from './components/HomeView';
import WorkspacePanel from './components/WorkspacePanel';
import InboxView from './components/InboxView';
import { v4 as uuidv4 } from 'uuid';
import type { Descendant, Element } from 'slate';
import { ChevronLeft, ChevronRight, Share2, Star, MoreHorizontal, Lock } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { workspacesApi, pagesApi, blocksApi, filesApi } from './api';
import { AnimatePresence, motion } from 'motion/react';
import type { Workspace, BackendBlock } from './api';
import { PageIcon } from './components/IconPicker';
import AnimatedPresence from './components/AnimatedPresence';

export interface PageData {
  id: string;
  title: string;
  content: Descendant[];
  cover?: string;
  coverPosition?: number;
  icon?: string;
  parentId?: string;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Activity {
  id: string;
  type: 'edit' | 'delete' | 'create' | 'icon-change' | 'block-add' | 'block-delete';
  userName: string;
  userInitial: string;
  pageId: string;
  pageTitle: string;
  pageIcon?: string;
  preview?: string;
  oldIcon?: string;
  newIcon?: string;
  timestamp: string;
}

// Slate content ↔ Backend Block 转换
function blocksToSlate(blocks: BackendBlock[]): Descendant[] {
  const textBlock = blocks.find(b => b.block_type === 'text');
  if (textBlock?.content?.slate) {
    return textBlock.content.slate as Descendant[];
  }
  return [{ type: 'paragraph', children: [{ text: '' }] } as Element];
}

function slateToBlockContent(content: Descendant[]): Record<string, any> {
  return { slate: content };
}

// ==========================================
// 未登录时用 localStorage 作为降级
// ==========================================
const LOCAL_PAGES_KEY = 'molink-pages';
const COVER_POSITIONS_KEY = 'molink-cover-positions';

function loadLocalPages(): PageData[] {
  try {
    const saved = localStorage.getItem(LOCAL_PAGES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveLocalPages(pages: PageData[]) {
  localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(pages));
}

function loadCoverPositions(): Record<string, number> {
  try {
    const saved = localStorage.getItem(COVER_POSITIONS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function saveCoverPosition(pageId: string, position: number) {
  const positions = loadCoverPositions();
  positions[pageId] = position;
  localStorage.setItem(COVER_POSITIONS_KEY, JSON.stringify(positions));
}

function getCoverPosition(pageId: string): number | undefined {
  return loadCoverPositions()[pageId];
}

export default function App() {
  const { user, loading: authLoading } = useAuth();

  const [pages, setPages] = useState<PageData[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [backStack, setBackStack] = useState<string[]>([]);
  const [forwardStack, setForwardStack] = useState<string[]>([]);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [guestPageCount, setGuestPageCount] = useState(0);
  const [loadingDone, setLoadingDone] = useState(false);

  // 视图状态
  const [activeView, setActiveView] = useState<'page' | 'home' | 'inbox'>('page');
  const [showSearch, setShowSearch] = useState(false);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);

  // 活动日志（收件箱）
  const [activities, setActivities] = useState<Activity[]>([]);

  const blockIdMap = useRef<Record<string, string>>({}); // pageId -> blockId

  // ==========================================
  // 已登录：从后端加载数据
  // ==========================================
  const loadWorkspace = useCallback(async () => {
    if (!user) return;
    try {
      const list = await workspacesApi.list();
      if (list.length > 0) {
        setWorkspace(list[0]);
      } else {
        const ws = await workspacesApi.create({ name: '我的空间' });
        setWorkspace(ws);
      }
    } catch (err) {
      console.error('加载工作空间失败:', err);
    }
  }, [user]);

  const loadPages = useCallback(async (wsId: string) => {
    try {
      setApiLoading(true);
      const loadedPages: PageData[] = [];
      const idMap: Record<string, string> = {};
      const coverPositions = loadCoverPositions();

      const loadRecursive = async (parentId?: string) => {
        const backendPages = parentId
          ? await pagesApi.getChildren(parentId)
          : await pagesApi.list(wsId);
        for (const bp of backendPages) {
          const blocks = await blocksApi.list(bp.id);
          const content = blocksToSlate(blocks);
          if (blocks.length > 0) {
            idMap[bp.id] = blocks[0].id;
          }
          loadedPages.push({
            id: bp.id,
            title: bp.title,
            content,
            cover: bp.cover_image || undefined,
            coverPosition: coverPositions[bp.id],
            icon: bp.icon || undefined,
            parentId: bp.parent_id || undefined,
            deletedAt: bp.deleted_at || undefined,
            createdAt: bp.created_at,
            updatedAt: bp.updated_at,
            createdBy: bp.created_by || undefined,
            updatedBy: bp.created_by || undefined,
          });
          await loadRecursive(bp.id);
        }
      };

      await loadRecursive();

      // 加载回收站中的页面
      try {
        const trashPages = await pagesApi.trash(wsId);
        for (const bp of trashPages) {
          if (loadedPages.some(p => p.id === bp.id)) continue;
          const blocks = await blocksApi.list(bp.id);
          const content = blocksToSlate(blocks);
          if (blocks.length > 0) {
            idMap[bp.id] = blocks[0].id;
          }
          loadedPages.push({
            id: bp.id,
            title: bp.title,
            content,
            cover: bp.cover_image || undefined,
            coverPosition: coverPositions[bp.id],
            icon: bp.icon || undefined,
            parentId: bp.parent_id || undefined,
            deletedAt: bp.deleted_at || undefined,
            createdAt: bp.created_at,
            updatedAt: bp.updated_at,
            createdBy: bp.created_by || undefined,
            updatedBy: bp.created_by || undefined,
          });
        }
      } catch (err) {
        console.error('加载回收站页面失败:', err);
      }

      blockIdMap.current = idMap;
      setPages(loadedPages);
      const activePages = loadedPages.filter(p => !p.deletedAt);
      setActivePageId(currentId => {
        if (activePages.length === 0) return null;
        if (!currentId || activePages.every(p => p.id !== currentId)) {
          return activePages[0].id;
        }
        return currentId;
      });
    } catch (err) {
      console.error('加载页面失败:', err);
    } finally {
      setApiLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 登录后自动加载工作空间和页面
  useEffect(() => {
    if (user) {
      loadWorkspace();
    }
  }, [user, loadWorkspace]);

  useEffect(() => {
    if (workspace) {
      loadPages(workspace.id);
    }
  }, [workspace, loadPages]);

  // ==========================================
  // 未登录：从 localStorage 加载
  // ==========================================
  // 认证状态变化时：已登录用户直接进入工作区
  useEffect(() => {
    if (user) {
      setShowWorkspace(true);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) return; // 已登录时不需要本地数据

    const local = loadLocalPages();
    if (local.length > 0) {
      setPages(local);
      setActivePageId(local[0].id);
    }
    // 不再自动创建空页面或触发登录弹窗
    // 用户通过 Landing Page 选择"开始使用"或"登录"
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // 未登录时持久化到 localStorage
  useEffect(() => {
    if (!user && pages.length > 0) {
      const timeout = setTimeout(() => saveLocalPages(pages), 300);
      return () => clearTimeout(timeout);
    }
  }, [pages, user]);

  // 活动日志持久化到 localStorage
  useEffect(() => {
    if (activities.length > 0) {
      localStorage.setItem('molink-activities', JSON.stringify(activities));
    }
  }, [activities]);

  useEffect(() => {
    const saved = localStorage.getItem('molink-activities');
    if (saved) {
      try {
        setActivities(JSON.parse(saved));
      } catch (e) {
        console.error('加载活动日志失败:', e);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // 活动日志
  // ==========================================
  // 合并同一页面短时间内的连续编辑（30 秒窗口）
  const addActivity = useCallback((type: Activity['type'], page: PageData, preview?: string) => {
    const userName = user?.full_name || user?.email.split('@')[0] || '访客';
    const now = new Date().toISOString();
    const MERGE_WINDOW_MS = 30_000; // 30 秒

    setActivities(prev => {
      // icon-change 不受合并机制影响
      const shouldMerge = type !== 'icon-change';

      if (shouldMerge) {
        // 查找同一页面、同一类型、同一用户、30 秒内的已有活动
        const existingIdx = prev.findIndex(a =>
          a.type === type &&
          a.pageId === page.id &&
          a.userName === userName &&
          (new Date(now).getTime() - new Date(a.timestamp).getTime()) < MERGE_WINDOW_MS
        );

        if (existingIdx !== -1) {
          // 合并：更新 timestamp 和 preview
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            pageTitle: page.title || '无标题',
            pageIcon: page.icon,
            preview: preview !== undefined ? preview : updated[existingIdx].preview,
            timestamp: now,
          };
          // 将更新后的活动移到最前面
          const [moved] = updated.splice(existingIdx, 1);
          return [moved, ...updated];
        }
      }

      // 新建活动
      const activity: Activity = {
        id: uuidv4(),
        type,
        userName,
        userInitial: userName.charAt(0).toUpperCase(),
        pageId: page.id,
        pageTitle: page.title || '无标题',
        pageIcon: page.icon,
        preview,
        timestamp: now,
      };
      return [activity, ...prev];
    });
  }, [user]);

  // 从 Slate 内容提取预览文本（按块换行）
  const extractPreview = useCallback((content: Descendant[]): string => {
    const lines: string[] = [];
    for (const node of content as any[]) {
      if (node.children) {
        const line = node.children.map((c: any) => c.text || '').join('');
        if (line.trim()) lines.push(line.trim());
      } else if (node.text) {
        if (node.text.trim()) lines.push(node.text.trim());
      }
    }
    return lines.join('\n').slice(0, 800);
  }, []);

  // ==========================================
  // 页面操作
  // ==========================================
  const addPage = async (parentId?: string) => {
    const emptyContent: Descendant[] = [{ type: 'paragraph', children: [{ text: '' }] } as Element];

    if (user && workspace) {
      try {
        const bp = await pagesApi.create({
          workspace_id: workspace.id,
          parent_id: parentId,
          title: '',
          page_type: 'page',
        });
        const block = await blocksApi.create({
          page_id: bp.id,
          block_type: 'text',
          content: slateToBlockContent(emptyContent),
          position: 0,
        });
        blockIdMap.current[bp.id] = block.id;

        const newPage: PageData = {
          id: bp.id,
          title: bp.title,
          content: emptyContent,
          cover: bp.cover_image || undefined,
          icon: bp.icon || undefined,
          parentId: bp.parent_id || undefined,
          createdAt: bp.created_at,
          updatedAt: bp.updated_at,
          createdBy: bp.created_by || undefined,
          updatedBy: bp.created_by || undefined,
        };
        setPages(prev => [...prev, newPage]);
        addActivity('create', newPage);
        if (activePageId) setBackStack(prev => [...prev, activePageId]);
        setForwardStack([]);
        setActivePageId(bp.id);
        return;
      } catch (err) {
        console.error('创建页面失败:', err);
      }
    }

    // 未登录降级
    addLocalPage(parentId);
  };

  const addLocalPage = (parentId?: string) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const userId = user?.id;
    const newPage: PageData = {
      id,
      title: '',
      content: [{ type: 'paragraph', children: [{ text: '' }] } as Element],
      parentId,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };
    setPages(prev => [...prev, newPage]);
    addActivity('create', newPage);
    if (activePageId) setBackStack(prev => [...prev, activePageId]);
    setForwardStack([]);
    setActivePageId(id);
  };

  const activatePage = (id: string) => {
    if (id === activePageId && activeView === 'page') return;
    if (activePageId && activeView === 'page') setBackStack(prev => [...prev, activePageId]);
    setForwardStack([]);
    setActivePageId(id);
    setActiveView('page');
  };

  const getDescendantIds = useCallback((pageId: string, allPages: PageData[]): string[] => {
    const descendants: string[] = [];
    const children = allPages.filter(p => p.parentId === pageId);
    for (const child of children) {
      descendants.push(child.id);
      descendants.push(...getDescendantIds(child.id, allPages));
    }
    return descendants;
  }, []);

  const closePage = useCallback((id: string) => {
    const pageToDelete = pages.find(p => p.id === id);
    if (pageToDelete) {
      addActivity('delete', pageToDelete);
    }
    const now = new Date().toISOString();
    setPages(prev => {
      const descendantIds = getDescendantIds(id, prev);
      const allIds = new Set([id, ...descendantIds]);
      const newPages = prev.map(p =>
        allIds.has(p.id) ? { ...p, deletedAt: now } : p
      );
      if (id === activePageId) {
        const remaining = newPages.filter(p => !p.deletedAt);
        const nextActive = remaining[0] || null;
        setActivePageId(nextActive?.id || null);
      }
      return newPages;
    });
    setBackStack(prev => prev.filter(pid => pid !== id));
    setForwardStack(prev => prev.filter(pid => pid !== id));
    // 已登录时同步软删除后端
    if (user) {
      pagesApi.delete(id).catch(err => console.error('删除页面失败:', err));
      const descendantIds = getDescendantIds(id, pages);
      for (const descId of descendantIds) {
        pagesApi.delete(descId).catch(err => console.error('删除子页面失败:', err));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pages, getDescendantIds, activePageId, addActivity]);

  const restorePage = useCallback(async (id: string) => {
    setPages(prev => {
      const descendantIds = getDescendantIds(id, prev);
      const allIds = new Set([id, ...descendantIds]);
      return prev.map(p => allIds.has(p.id) ? { ...p, deletedAt: undefined } : p);
    });
    if (user) {
      try {
        await pagesApi.restore(id);
      } catch (err) {
        console.error('恢复页面失败:', err);
      }
    }
  }, [user, getDescendantIds]);

  const permanentDeletePage = useCallback((id: string) => {
    setPages(prev => {
      const descendantIds = getDescendantIds(id, prev);
      const allIdsToRemove = new Set([id, ...descendantIds]);
      const newPages = prev.filter(p => !allIdsToRemove.has(p.id));
      if (id === activePageId || descendantIds.includes(activePageId || '')) {
        const nextActive = newPages[0] || null;
        setActivePageId(nextActive?.id || null);
      }
      return newPages;
    });
    setBackStack(prev => prev.filter(pid => pid !== id));
    setForwardStack(prev => prev.filter(pid => pid !== id));
    if (user) {
      pagesApi.permanentDelete(id).catch(err => console.error('永久删除页面失败:', err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, getDescendantIds, activePageId]);

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

  // ==========================================
  // 全局快捷键
  // ==========================================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ==========================================
  // 更新页面（标题 + 内容 + 封面）
  // ==========================================
  const updatePage = useCallback(async (
    id: string,
    newData: Partial<PageData>,
    activityType?: Activity['type'] | null,
    activityPreview?: string,
  ) => {
    const now = new Date().toISOString();
    const userId = user?.id;
    const dataWithTimestamp: Partial<PageData> = {
      ...newData,
      updatedAt: now,
      updatedBy: userId,
    };
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...dataWithTimestamp } : p));

    // 记录活动（activityType 显式传 null 时跳过）
    const page = pages.find(p => p.id === id);
    if (page && activityType !== null) {
      const updatedPage = { ...page, ...dataWithTimestamp };
      let type: Activity['type'] = activityType || 'edit';
      let preview = activityPreview;

      // 图标变更自动推断
      if (newData.icon !== undefined && activityType === undefined) {
        type = 'icon-change';
        preview = undefined;
      }

      if (type === 'icon-change') {
        const activity: Activity = {
          id: uuidv4(),
          type: 'icon-change',
          userName: user?.full_name || user?.email.split('@')[0] || '访客',
          userInitial: (user?.full_name || user?.email.split('@')[0] || '访客').charAt(0).toUpperCase(),
          pageId: updatedPage.id,
          pageTitle: updatedPage.title || '无标题',
          pageIcon: updatedPage.icon,
          oldIcon: page.icon,
          newIcon: newData.icon || undefined,
          timestamp: now,
        };
        setActivities(prev => [activity, ...prev]);
      } else {
        if (preview === undefined && newData.content) {
          preview = extractPreview(newData.content);
        }
        addActivity(type, updatedPage, preview);
      }
    }

    if (!user) return; // 未登录不调用后端

    try {
      const page = pages.find(p => p.id === id);
      if (!page) return;

      // 更新页面基本信息
      if (newData.title !== undefined || newData.cover !== undefined || newData.coverPosition !== undefined || newData.icon !== undefined) {
        await pagesApi.update(id, {
          title: newData.title,
          cover_image: newData.cover,
          cover_position: newData.coverPosition,
          icon: newData.icon,
        });
      }

      // 保存封面位置到 localStorage（兜底，后端可能暂不支持）
      if (newData.coverPosition !== undefined) {
        saveCoverPosition(id, newData.coverPosition);
      }

      // 更新内容 block
      if (newData.content !== undefined) {
        const blockId = blockIdMap.current[id];
        if (blockId) {
          await blocksApi.update(blockId, {
            content: slateToBlockContent(newData.content),
          });
        } else {
          // 如果没有 blockId，创建一个新的
          const block = await blocksApi.create({
            page_id: id,
            block_type: 'text',
            content: slateToBlockContent(newData.content),
            position: 0,
          });
          blockIdMap.current[id] = block.id;
        }
      }
    } catch (err) {
      console.error('保存页面失败:', err);
    }
  }, [user, pages, addActivity, extractPreview, setActivities]);

  // 封面上传
  const uploadCover = async (pageId: string, file: File): Promise<string | null> => {
    if (!user) {
      // 未登录降级：Base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
    }
    try {
      const res = await filesApi.upload(file);
      if (res.success && res.file) {
        await pagesApi.update(pageId, { cover_image: res.file.url });
        return res.file.url;
      }
    } catch (err) {
      console.error('上传封面失败:', err);
    }
    return null;
  };

  // ==========================================
  // 登录后迁移本地数据
  // ==========================================
  const handleLoginSuccess = () => {
    setShowLogin(false);
    const local = loadLocalPages();
    const meaningful = local.filter(p => {
      const hasTitle = p.title && p.title.trim().length > 0;
      const hasContent = p.content.length > 1 || (p.content[0] as Element)?.children?.[0]?.text !== '';
      return hasTitle || hasContent;
    });
    if (meaningful.length > 0) {
      setGuestPageCount(meaningful.length);
      setShowMigrationDialog(true);
    }
  };

  const migrateLocalPages = async () => {
    if (!workspace) return;
    const local = loadLocalPages();
    for (const p of local) {
      try {
        const bp = await pagesApi.create({
          workspace_id: workspace.id,
          title: p.title,
          page_type: 'page',
          cover_image: p.cover,
          icon: p.icon,
        });
        await blocksApi.create({
          page_id: bp.id,
          block_type: 'text',
          content: slateToBlockContent(p.content),
          position: 0,
        });
      } catch (err) {
        console.error('迁移页面失败:', err);
      }
    }
    localStorage.removeItem(LOCAL_PAGES_KEY);
    setShowMigrationDialog(false);
    setGuestPageCount(0);
    if (workspace) loadPages(workspace.id);
  };

  const discardLocalPages = () => {
    localStorage.removeItem(LOCAL_PAGES_KEY);
    setShowMigrationDialog(false);
    setGuestPageCount(0);
    setPages([]);
    setActivePageId(null);
    addLocalPage();
  };

  const activePage = pages.find(p => p.id === activePageId);

  // 计算面包屑路径
  const breadcrumbPath = useMemo(() => {
    if (!activePage) return [];
    const path: PageData[] = [];
    let current: PageData | undefined = activePage;
    while (current) {
      path.unshift(current);
      if (!current.parentId) break;
      current = pages.find(p => p.id === current!.parentId);
    }
    return path;
  }, [activePage, pages]);

  // 当前页面的子页面（包含已删除的，用于 page-link 块渲染）
  const childPages = useMemo(() => {
    if (!activePageId) return [];
    return pages.filter(p => p.parentId === activePageId);
  }, [pages, activePageId]);

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
      className="relative h-screen w-full overflow-hidden bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <AnimatePresence mode="wait">
        {isLanding ? (
          <motion.div
            key="landing"
            className="absolute inset-0 z-20"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <LandingPage
              onEnterWorkspace={() => {
                setShowWorkspace(true);
                const local = loadLocalPages();
                if (local.length === 0) {
                  addLocalPage();
                } else {
                  setPages(local);
                  setActivePageId(local[0].id);
                }
              }}
              onLogin={() => setShowLogin(true)}
            />
            <Login
              isOpen={showLogin}
              onClose={() => setShowLogin(false)}
              onLogin={handleLoginSuccess}
            />
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            className="flex h-full w-full"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Sidebar
              pages={pages}
              activePageId={activePageId}
              setActivePageId={activatePage}
              addPage={addPage}
              closePage={closePage}
              restorePage={restorePage}
              permanentDeletePage={permanentDeletePage}
              user={user ? { id: user.id, name: user.full_name || user.email.split('@')[0], email: user.email, avatar: user.avatar_url || undefined } : null}
              onShowLogin={() => setShowLogin(true)}
              activeView={activeView}
              onSetView={setActiveView}
              onShowSearch={() => setShowSearch(true)}
              onShowWorkspace={() => setShowWorkspacePanel(true)}
            />

      {/* 登录弹窗 */}
      <Login
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLogin={handleLoginSuccess}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="h-11 flex items-center justify-between px-4 bg-background flex-shrink-0">
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
            {activeView === 'page' && activePage && (
              <div className="flex items-center gap-1 ml-2">
                {breadcrumbPath.map((page, idx) => (
                  <React.Fragment key={page.id}>
                    {idx > 0 && (
                      <span className="text-muted-foreground mx-0.5">/</span>
                    )}
                    <button
                      onClick={() => {
                        if (idx < breadcrumbPath.length - 1) {
                          setActivePageId(page.id);
                        }
                      }}
                      className={`flex items-center gap-1 text-sm truncate max-w-[140px] transition-colors ${
                        idx === breadcrumbPath.length - 1
                          ? 'font-medium text-foreground cursor-default'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {page.icon && (
                        <PageIcon icon={page.icon} size={14} />
                      )}
                      <span>{page.title || '无标题'}</span>
                    </button>
                  </React.Fragment>
                ))}
                <span className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
                  <Lock className="w-3 h-3" />
                  私人
                </span>
              </div>
            )}
            {activeView === 'home' && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm font-medium text-foreground">主页</span>
              </div>
            )}
            {activeView === 'inbox' && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm font-medium text-foreground">收件箱</span>
              </div>
            )}
          </div>
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

        {/* 编辑区 / 主页 / 收件箱 */}
        <div className="flex-1 overflow-auto bg-background">
          {activeView === 'page' && activePageId && activePage && (
            <Editor
              page={activePage}
              childPages={childPages}
              updatePage={updatePage}
              uploadCover={uploadCover}
              onActivatePage={activatePage}
              restorePage={restorePage}
              permanentDeletePage={permanentDeletePage}
            />
          )}
          {activeView === 'home' && (
            <HomeView pages={pages} onNavigate={activatePage} />
          )}
          {activeView === 'inbox' && (
            <InboxView
              activities={activities}
              onNavigate={activatePage}
            />
          )}
        </div>
      </div>

      {/* 搜索弹窗 */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        pages={pages}
        onNavigate={(id) => {
          activatePage(id);
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

      {/* 页面迁移确认对话框 */}
      <AnimatedPresence
        show={showMigrationDialog}
        duration={200}
        enterFrom="opacity-0 backdrop-blur-[0px] bg-black/0"
        enterTo="opacity-100 backdrop-blur-sm bg-black/60"
        className="fixed inset-0 z-[100] flex items-center justify-center"
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
            <p className="text-muted-foreground text-[15px] text-center mb-6 leading-relaxed">
              你在未登录状态下创建了 <span className="font-semibold text-card-foreground">{guestPageCount}</span> 个页面，
              是否将它们迁移到云端？
            </p>
            <div className="space-y-3">
              <button
                onClick={migrateLocalPages}
                className="w-full h-11 bg-primary text-primary-foreground text-[15px] font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                迁移到云端
              </button>
              <button
                onClick={discardLocalPages}
                className="w-full h-11 border border-border text-secondary-foreground text-[15px] font-medium rounded-lg hover:bg-accent transition-colors"
              >
                不保留，重新开始
              </button>
            </div>
          </div>
      </AnimatedPresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
