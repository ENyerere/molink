import { useState, useEffect, useCallback, useRef, useMemo, useTransition, lazy, Suspense } from 'react';
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
import { v4 as uuidv4 } from 'uuid';
import { Element, type Descendant } from 'slate';
import { useAuth } from './context/AuthContext';
import { workspacesApi, pagesApi, blocksApi, filesApi } from './api';
import { AnimatePresence, motion } from 'motion/react';
import type { Workspace, BackendBlock, BackendPage, UpdatePageData } from './api';
import AnimatedPresence from './components/AnimatedPresence';
import Topbar, { type SaveIndicatorState } from './components/Topbar';

// 懒加载占位：轻量居中 spinner。不要用 LoadingScreen——它有自己的进度计时逻辑，
// 作为 Suspense fallback 会反复触发计时与 onFinish 副作用
function LazyFallback({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={`flex items-center justify-center bg-background ${fullScreen ? 'h-screen w-full' : 'h-full w-full'}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

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

function slateToBlockContent(content: Descendant[]): Record<string, unknown> {
  // 落库前剥离瞬态状态：块级选中的 selected 标记与渲染用 page-link 块，
  // 否则刷新后内容里会带蓝色选中高亮 / 与 page-link 同步逻辑重复的链接块
  const slate = content
    .filter(node => !(Element.isElement(node) && node.type === 'page-link'))
    .map(node => {
      if (!Element.isElement(node) || !('selected' in node)) return node;
      const rest: typeof node = { ...node };
      delete (rest as { selected?: boolean }).selected;
      return rest as Descendant;
    });
  return { slate };
}

// 内容保存状态：按页面 id 各自维护防抖计时器、单调递增版本号与在途标记
interface ContentSaveState {
  timer?: ReturnType<typeof setTimeout>;
  version: number;
  inFlight: boolean;
  pendingContent?: Descendant[];
  retries: number;
}

// 顶栏保存状态指示：记录最近一次调度/完成保存的页面与时间，仅供 UI 读取，与保存队列语义解耦
interface PageSaveIndicator {
  pageId: string;
  status: 'saving' | 'saved';
  savedAt?: number;
}

function getContentSaveState(states: Record<string, ContentSaveState>, pageId: string): ContentSaveState {
  if (!states[pageId]) {
    states[pageId] = { version: 0, inFlight: false, retries: 0 };
  }
  return states[pageId];
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
  } catch {
    // 本地数据损坏时按无数据处理
  }
  return [];
}

function saveLocalPages(pages: PageData[]) {
  try {
    localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(pages));
  } catch (err) {
    // 存储配额超限（多为 base64 封面过大）：去掉本地封面后重试一次，保住正文数据
    console.error('保存本地页面失败，尝试去除封面后重试:', err);
    try {
      const stripped = pages.map(p => (p.cover?.startsWith('data:') ? { ...p, cover: undefined } : p));
      localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(stripped));
    } catch (err2) {
      console.error('保存本地页面失败：存储空间不足，请减少封面图片或页面数量:', err2);
    }
  }
}

function loadCoverPositions(): Record<string, number> {
  try {
    const saved = localStorage.getItem(COVER_POSITIONS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // 本地数据损坏时按无数据处理
  }
  return {};
}

function saveCoverPosition(pageId: string, position: number) {
  const positions = loadCoverPositions();
  positions[pageId] = position;
  localStorage.setItem(COVER_POSITIONS_KEY, JSON.stringify(positions));
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
  const [activeView, setActiveView] = useState<'page' | 'home' | 'inbox'>('home');
  const [showSearch, setShowSearch] = useState(false);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);

  // 活动日志（收件箱）
  const [activities, setActivities] = useState<Activity[]>([]);

  // 宽版内容列开关（持久化到 localStorage）
  const [wideMode, setWideMode] = useState(() => {
    try {
      return localStorage.getItem('molink-wide-mode') === '1';
    } catch {
      return false;
    }
  });
  const toggleWideMode = useCallback(() => {
    setWideMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('molink-wide-mode', next ? '1' : '0');
      } catch {
        // localStorage 不可用时仅保持会话内生效
      }
      return next;
    });
  }, []);

  // 顶栏保存状态指示（仅 UI 外显，读写均不影响保存队列）
  const [saveIndicator, setSaveIndicator] = useState<PageSaveIndicator | null>(null);

  const blockIdMap = useRef<Record<string, string>>({}); // pageId -> blockId
  const contentSaveStates = useRef<Record<string, ContentSaveState>>({});
  // 标题保存防抖：pageId -> 定时器 / 最新标题
  const titleTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const titleLatest = useRef<Record<string, string>>({});
  // 会话世代号：登录/登出或重新调用 loadPages 时 +1，使在途加载失效
  const sessionRef = useRef(0);

  // 发送指定页面的最新待保存内容（同一页面串行发送，避免并发 PUT 乱序覆盖）
  const flushContentSave = useCallback(async (pageId: string) => {
    const st = getContentSaveState(contentSaveStates.current, pageId);
    if (st.timer) {
      clearTimeout(st.timer);
      st.timer = undefined;
    }
    if (st.inFlight || st.pendingContent === undefined) return;
    const version = st.version;
    const content = st.pendingContent;
    st.pendingContent = undefined;
    st.inFlight = true;
    try {
      const blockId = blockIdMap.current[pageId];
      if (blockId) {
        await blocksApi.update(blockId, {
          content: slateToBlockContent(content),
        });
      } else {
        // 如果没有 blockId，创建一个新的
        const block = await blocksApi.create({
          page_id: pageId,
          block_type: 'text',
          content: slateToBlockContent(content),
          position: 0,
        });
        blockIdMap.current[pageId] = block.id;
      }
    } catch (err) {
      console.error('保存页面内容失败:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      // 401 是登录态失效，重试无意义（由 auth_expired 流程接管）；
      // 其他失败把内容放回待保存队列并做有限次退避重试，避免静默丢数据
      if (status !== 401 && st.pendingContent === undefined && st.retries < 3) {
        st.pendingContent = content;
        st.retries += 1;
        st.timer = setTimeout(() => {
          void flushContentSave(pageId);
        }, 1000 * st.retries);
      }
    } finally {
      st.inFlight = false;
      // 保存期间产生了更新版本：本次响应已过期，立即补发最新内容
      if (st.version > version) {
        void flushContentSave(pageId);
      } else {
        // 该页队列已清空：仅更新顶栏 UI 指示，不触碰队列本身
        st.retries = 0;
        setSaveIndicator({ pageId, status: 'saved', savedAt: Date.now() });
      }
    }
  }, []);

  // 内容保存防抖：400ms 内连续输入只发送最后一次
  const scheduleContentSave = useCallback((pageId: string, content: Descendant[]) => {
    const st = getContentSaveState(contentSaveStates.current, pageId);
    st.version += 1;
    st.pendingContent = content;
    st.retries = 0;
    // 仅外显 UI 状态，不改变队列行为
    setSaveIndicator({ pageId, status: 'saving' });
    if (st.timer) clearTimeout(st.timer);
    st.timer = setTimeout(() => {
      void flushContentSave(pageId);
    }, 400);
  }, [flushContentSave]);

  // 切换页面或组件卸载前，立即 flush 所有待保存内容
  const flushAllContentSaves = useCallback(() => {
    for (const pageId of Object.keys(contentSaveStates.current)) {
      void flushContentSave(pageId);
    }
  }, [flushContentSave]);

  const prevActivePageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevActivePageIdRef.current !== activePageId) {
      prevActivePageIdRef.current = activePageId;
      flushAllContentSaves();
    }
  }, [activePageId, flushAllContentSaves]);

  useEffect(() => {
    return () => flushAllContentSaves();
  }, [flushAllContentSaves]);

  // ==========================================
  // 已登录：从后端加载数据
  // ==========================================
  const loadPages = useCallback(async (wsId: string) => {
    // 每次调用开启新会话：世代号 +1，旧加载循环在 await 后校验时自动失效
    const session = ++sessionRef.current;
    const isStale = () => sessionRef.current !== session;
    try {
      setApiLoading(true);
      const loadedPages: PageData[] = [];
      const idMap: Record<string, string> = {};
      const coverPositions = loadCoverPositions();

      // 拉取单个页面的 blocks 并组装 PageData（idMap 是本会话局部变量，过期会话的写入不会落到 ref）
      const loadOne = async (bp: BackendPage): Promise<PageData> => {
        const blocks = await blocksApi.list(bp.id);
        const content = blocksToSlate(blocks);
        if (blocks.length > 0) {
          idMap[bp.id] = blocks[0].id;
        }
        return {
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
        };
      };

      const loadRecursive = async (parentId?: string) => {
        const backendPages = parentId
          ? await pagesApi.getChildren(parentId)
          : await pagesApi.list(wsId);
        if (isStale()) return;
        // 同级页面并发拉取 blocks，再并发递归各自子树，消除逐页串行 N+1
        const pageDataList = await Promise.all(backendPages.map(loadOne));
        if (isStale()) return;
        loadedPages.push(...pageDataList);
        await Promise.all(backendPages.map(bp => loadRecursive(bp.id)));
      };

      await loadRecursive();
      if (isStale()) return;

      // 加载回收站中的页面
      try {
        const trashPages = await pagesApi.trash(wsId);
        if (isStale()) return;
        // 已加载 id 建 Set，回收站去重从 O(n²) 降为 O(n)
        const loadedIds = new Set(loadedPages.map(p => p.id));
        const newTrashPages = trashPages.filter(bp => !loadedIds.has(bp.id));
        const trashDataList = await Promise.all(newTrashPages.map(loadOne));
        if (isStale()) return;
        loadedPages.push(...trashDataList);
      } catch (err) {
        console.error('加载回收站页面失败:', err);
      }

      // 会话已变更（登出/重新加载）：放弃全部写入，避免旧数据落到新会话
      if (isStale()) return;
      blockIdMap.current = idMap;
      setPages(loadedPages);
      const activePages = loadedPages.filter(p => !p.deletedAt);
      const activePageIds = new Set(activePages.map(p => p.id));
      setActivePageId(currentId => {
        if (activePages.length === 0) return null;
        if (currentId && activePageIds.has(currentId)) {
          return currentId;
        }
        return null;
      });
    } catch (err) {
      console.error('加载页面失败:', err);
    } finally {
      // 只关闭当前会话的加载态，避免误关新会话的 loading
      if (!isStale()) setApiLoading(false);
    }
  }, []);

  // 登录后加载工作空间与页面：合并为单条异步链，消除 user → workspace state → pages 的请求瀑布。
  // cancelled 标志保证登出/切换账号后不再写入旧用户的数据；
  // 无工作空间时自动创建"我的空间"（保持原有行为）
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await workspacesApi.list();
        if (cancelled) return;
        const ws = list.length > 0 ? list[0] : await workspacesApi.create({ name: '我的空间' });
        if (cancelled) return;
        setWorkspace(ws);
        await loadPages(ws.id);
      } catch (err) {
        if (!cancelled) console.error('加载工作空间失败:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user, loadPages]);

  // ==========================================
  // 未登录：从 localStorage 加载
  // ==========================================
  // ==========================================
  // 登录/退出登录状态切换
  // ==========================================
  const prevUserRef = useRef(user);
  useEffect(() => {
    const wasLoggedIn = !!prevUserRef.current;
    const isLoggedIn = !!user;

    // 登录状态变化：会话世代号 +1，使在途的 loadPages 写入全部失效
    if (wasLoggedIn !== isLoggedIn) {
      sessionRef.current += 1;
    }

    if (!wasLoggedIn && isLoggedIn) {
      // 用户刚刚登录：进入工作区并显示主页
      setShowWorkspace(true);
      setActiveView('home');
      // 迁移检查放在这里：登录弹窗与 OAuth 整页跳转两条路径都会触发。
      // 注意会话恢复（刷新页面）也会经过此分支，效果等同"登录后提醒一次"
      const local = loadLocalPages();
      const meaningful = local.filter(p => {
        if (p.deletedAt) return false; // 回收站中的本地页面不参与迁移
        const hasTitle = p.title && p.title.trim().length > 0;
        const hasContent = p.content.length > 1 || (p.content[0] as Element)?.children?.[0]?.text !== '';
        return hasTitle || hasContent;
      });
      if (meaningful.length > 0) {
        setGuestPageCount(meaningful.length);
        setShowMigrationDialog(true);
      }
    }

    if (wasLoggedIn && !isLoggedIn) {
      // 用户刚刚退出登录：清理状态，回到 landing
      setShowWorkspace(false);
      setPages([]);
      setActivePageId(null);
      setActiveView('home');
      setBackStack([]);
      setForwardStack([]);
      setWorkspace(null);
      blockIdMap.current = {};
    }

    prevUserRef.current = user;
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) return; // 已登录时不需要本地数据

    const local = loadLocalPages();
    if (local.length > 0) {
      setPages(local);
    }
    // 不再自动创建空页面或触发登录弹窗
    // 用户通过 Landing Page 选择"开始使用"或"登录"
  }, [authLoading, user]);

  // 未登录时持久化到 localStorage
  // 删到 0 页也要写回（空数组覆盖），否则刷新后已删页面会复活；
  // 认证状态恢复期间（authLoading）不写，避免用初始空数组覆盖访客数据
  useEffect(() => {
    if (!user && !authLoading) {
      const timeout = setTimeout(() => saveLocalPages(pages), 300);
      return () => clearTimeout(timeout);
    }
  }, [pages, user, authLoading]);

  // 活动日志按用户隔离存储，访客使用固定 key；旧的全局单 key 直接弃用
  const activitiesKey = user ? `molink-activities-${user.id}` : 'molink-activities-guest';
  const skipActivitiesPersistRef = useRef(true);

  // 登录/登出切换：加载当前账号对应的活动日志
  useEffect(() => {
    // 标记跳过切换后的第一次持久化，避免把上一账号内存中的活动写入新 key
    skipActivitiesPersistRef.current = true;
    try {
      const saved = localStorage.getItem(activitiesKey);
      setActivities(saved ? JSON.parse(saved) : []);
    } catch (e) {
      console.error('加载活动日志失败:', e);
      setActivities([]);
    }
    // 旧版本全局单 key 的数据不做迁移，直接清除
    localStorage.removeItem('molink-activities');
  }, [activitiesKey]);

  // 活动日志持久化到 localStorage
  useEffect(() => {
    if (skipActivitiesPersistRef.current) {
      skipActivitiesPersistRef.current = false;
      return;
    }
    localStorage.setItem(activitiesKey, JSON.stringify(activities));
  }, [activities, activitiesKey]);

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
    for (const node of content) {
      if (Element.isElement(node)) {
        const line = node.children.map(c => c.text || '').join('');
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
        };
        setPages(prev => [...prev, newPage]);
        addActivity('create', newPage);
        if (activePageId) setBackStack(prev => [...prev, activePageId]);
        setForwardStack([]);
        setActivePageId(bp.id);
        setActiveView('page');
        return;
      } catch (err) {
        // 登录态下创建失败不降级到本地，避免产生刷新后即消失的幽灵本地页
        console.error('创建页面失败:', err);
        return;
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
    };
    setPages(prev => [...prev, newPage]);
    addActivity('create', newPage);
    if (activePageId) setBackStack(prev => [...prev, activePageId]);
    setForwardStack([]);
    setActivePageId(id);
    setActiveView('page');
  };

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

  // 页面索引：id 直查与父→子映射，替代渲染期反复的 find/filter 线性扫描
  const pagesById = useMemo(() => {
    const map = new Map<string, PageData>();
    for (const p of pages) map.set(p.id, p);
    return map;
  }, [pages]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, PageData[]>();
    for (const p of pages) {
      if (!p.parentId) continue;
      const siblings = map.get(p.parentId);
      if (siblings) siblings.push(p);
      else map.set(p.parentId, [p]);
    }
    return map;
  }, [pages]);

  // 基于 childrenByParent 收集整棵子树（DFS 先序，与原逐层 filter 版本的结果顺序一致）
  const getDescendantIds = useCallback((pageId: string): string[] => {
    const descendants: string[] = [];
    const walk = (id: string) => {
      const children = childrenByParent.get(id);
      if (!children) return;
      for (const child of children) {
        descendants.push(child.id);
        walk(child.id);
      }
    };
    walk(pageId);
    return descendants;
  }, [childrenByParent]);

  const closePage = useCallback((id: string) => {
    const pageToDelete = pagesById.get(id);
    if (pageToDelete) {
      addActivity('delete', pageToDelete);
    }
    const now = new Date().toISOString();
    // 后代在 setState 之前基于当前渲染的索引算好，updater 内不再做全表扫描；
    // 与原先在 updater 内读 prev 等价：事件触发时当前渲染的 pages 即最新已提交状态
    const allIds = new Set([id, ...getDescendantIds(id)]);
    // 不在 setPages updater 里调 setActivePageId（StrictMode 双调用 updater 会重复执行副作用）；
    // 直接基于当前渲染的 pages 计算下一个激活页
    setPages(prev => prev.map(p =>
      allIds.has(p.id) ? { ...p, deletedAt: now } : p
    ));
    if (id === activePageId) {
      const nextActive = pages.find(p => !allIds.has(p.id) && !p.deletedAt) || null;
      setActivePageId(nextActive?.id || null);
    }
    setBackStack(prev => prev.filter(pid => pid !== id));
    setForwardStack(prev => prev.filter(pid => pid !== id));
    // 已登录时同步软删除后端（后端在单个事务中级联软删除整棵子树，无需逐页删后代）
    if (user) {
      pagesApi.delete(id).catch(err => console.error('删除页面失败:', err));
    }
  }, [user, pages, pagesById, getDescendantIds, activePageId, addActivity]);

  const restorePage = useCallback(async (id: string) => {
    // 同 closePage：先算好后代再 setState
    const allIds = new Set([id, ...getDescendantIds(id)]);
    setPages(prev => prev.map(p => allIds.has(p.id) ? { ...p, deletedAt: undefined } : p));
    if (user) {
      try {
        await pagesApi.restore(id);
      } catch (err) {
        console.error('恢复页面失败:', err);
      }
    }
  }, [user, getDescendantIds]);

  const permanentDeletePage = useCallback((id: string) => {
    // 同 closePage：先算好后代再 setState
    const descendantIds = getDescendantIds(id);
    const allIdsToRemove = new Set([id, ...descendantIds]);
    setPages(prev => prev.filter(p => !allIdsToRemove.has(p.id)));
    if (id === activePageId || descendantIds.includes(activePageId || '')) {
      const nextActive = pages.find(p => !allIdsToRemove.has(p.id)) || null;
      setActivePageId(nextActive?.id || null);
    }
    setBackStack(prev => prev.filter(pid => pid !== id));
    setForwardStack(prev => prev.filter(pid => pid !== id));
    if (user) {
      pagesApi.permanentDelete(id).catch(err => console.error('永久删除页面失败:', err));
    }
  }, [user, pages, getDescendantIds, activePageId]);

  // 纯函数式导航：updater 内不调用其他 setState。
  // StrictMode 会双调用 updater，混入副作用会导致历史栈状态错乱（如页面被重复压栈）
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

  const canGoBack = backStack.length > 0;
  const canGoForward = forwardStack.length > 0;

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
    const dataWithTimestamp: Partial<PageData> = {
      ...newData,
      updatedAt: now,
    };
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...dataWithTimestamp } : p));

    // 记录活动（activityType 显式传 null 时跳过）
    const page = pagesById.get(id);
    if (page && activityType !== null) {
      const updatedPage = { ...page, ...dataWithTimestamp };
      let type: Activity['type'] = activityType || 'edit';
      let preview = activityPreview;

      // 图标变更自动推断（用 in 判断：显式传 undefined 表示清除图标，也算变更）
      if ('icon' in newData && activityType === undefined) {
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
      const page = pagesById.get(id);
      if (!page) return;

      // 更新页面基本信息。icon / cover 用 in 判断：调用方显式传 undefined 表示清除，
      // 转为 null 发给后端（exclude_unset 语义下显式 null 会被写入，即置空）
      // 标题单独走 500ms 防抖：本地状态已即时更新，网络请求按页合并，
      // 避免标题每敲一键就发一次 PUT
      const metaUpdate: UpdatePageData = {};
      if ('cover' in newData) metaUpdate.cover_image = newData.cover ?? null;
      if (newData.coverPosition !== undefined) metaUpdate.cover_position = newData.coverPosition;
      if ('icon' in newData) metaUpdate.icon = newData.icon ?? null;
      if (Object.keys(metaUpdate).length > 0) {
        await pagesApi.update(id, metaUpdate);
      }
      if (newData.title !== undefined) {
        titleLatest.current[id] = newData.title;
        const existing = titleTimers.current[id];
        if (existing) clearTimeout(existing);
        titleTimers.current[id] = setTimeout(() => {
          const title = titleLatest.current[id];
          if (title === undefined) return;
          pagesApi.update(id, { title }).catch(err => {
            console.error('保存页面标题失败:', err);
          });
        }, 500);
      }

      // 保存封面位置到 localStorage（兜底，后端可能暂不支持）
      if (newData.coverPosition !== undefined) {
        saveCoverPosition(id, newData.coverPosition);
      }

      // 更新内容 block：按页面防抖 + 串行发送，避免快速编辑时并发 PUT 乱序覆盖
      if (newData.content !== undefined) {
        scheduleContentSave(id, newData.content);
      }
    } catch (err) {
      console.error('保存页面失败:', err);
    }
  }, [user, pagesById, addActivity, extractPreview, setActivities, scheduleContentSave]);

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
    setActiveView('home');
    // 本地页面迁移检查已移至登录状态切换 effect，弹窗与 OAuth 登录都会触发
  };

  const migrateLocalPages = async () => {
    if (!workspace) return;
    // 回收站中的本地页面不迁移，随成功批次一并从本地清除
    const local = loadLocalPages().filter(p => !p.deletedAt);
    const idMap: Record<string, string> = {}; // 本地 id -> 后端 id
    const failed: PageData[] = [];

    const migrateOne = async (p: PageData) => {
      try {
        const bp = await pagesApi.create({
          workspace_id: workspace.id,
          parent_id: p.parentId ? idMap[p.parentId] : undefined,
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
        idMap[p.id] = bp.id;
      } catch (err) {
        // 失败的页面保留在 localStorage，避免丢页，下次登录可重试
        console.error('迁移页面失败:', err);
        failed.push(p);
      }
    };

    // 按层级拓扑序迁移：父页面先于子页面，保证 parent_id 能映射到后端 id
    const pending = [...local];
    // 待迁移 id 集合与 pending 同步维护，父页面在队判断从 O(n) 扫描降为 O(1)
    const pendingIds = new Set(local.map(p => p.id));
    let progressed = true;
    while (pending.length > 0 && progressed) {
      progressed = false;
      for (let i = pending.length - 1; i >= 0; i--) {
        // 父页面仍在待迁移队列中则等下一轮；父页面不在本地集合（悬空）按根页面处理
        const parentId = pending[i].parentId;
        if (parentId && pendingIds.has(parentId)) continue;
        await migrateOne(pending[i]);
        pendingIds.delete(pending[i].id);
        pending.splice(i, 1);
        progressed = true;
      }
    }
    // 极端情况（本地数据成环）剩余的页面按根页面迁移
    for (const p of pending) {
      await migrateOne(p);
    }

    if (failed.length > 0) {
      console.error(`${failed.length} 个本地页面迁移失败，已保留在本地存储，下次登录可重试`);
      saveLocalPages(failed);
    } else {
      localStorage.removeItem(LOCAL_PAGES_KEY);
    }
    setShowMigrationDialog(false);
    setGuestPageCount(0);
    setPages([]);
    setActivePageId(null);
    loadPages(workspace.id);
  };

  const discardLocalPages = () => {
    localStorage.removeItem(LOCAL_PAGES_KEY);
    setShowMigrationDialog(false);
    setGuestPageCount(0);
    setPages([]);
    setActivePageId(null);
    // 与迁移分支一致：丢弃后重新加载云端页面，避免停留在空白状态
    if (workspace) loadPages(workspace.id);
  };

  const activePage = activePageId ? pagesById.get(activePageId) : undefined;

  // 页面视图下激活页已不存在（被永久删除/加载后失效）时回退到主页，避免内容区空白、面包屑残留。
  // 注意：回收站中的页面仍允许打开（编辑器有"已移至回收站"横幅），不在此列
  useEffect(() => {
    if (activeView === 'page' && (!activePageId || !activePage)) {
      setActiveView('home');
    }
  }, [activeView, activePageId, activePage]);

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
                  const local = loadLocalPages();
                  if (local.length > 0) {
                    setPages(local);
                  }
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
          onNavigatePage={setActivePageId}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onGoBack={goBack}
          onGoForward={goForward}
          saveIndicator={topbarSaveIndicator}
          isGuest={!user}
          wideMode={wideMode}
          onToggleWide={toggleWideMode}
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
                onActivatePage={activatePage}
                restorePage={restorePage}
                permanentDeletePage={permanentDeletePage}
                wideMode={wideMode}
              />
            )}
            {activeView === 'home' && (
              <HomeView pages={pages} onNavigate={activatePage} onCreatePage={() => addPage()} />
            )}
            {activeView === 'inbox' && (
              <InboxView
                activities={activities}
                onNavigate={activatePage}
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
      </Suspense>

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
