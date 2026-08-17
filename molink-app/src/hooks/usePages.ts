// 页面数据核心：pages 状态、云端/访客双模式加载、CRUD、本地→云端迁移
// 上层（App）只编排，不再直接触碰 pagesApi/blocksApi 或 localStorage
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Element, type Descendant } from 'slate';
import { workspacesApi, pagesApi, blocksApi, filesApi } from '../api';
import type { BackendUser, BackendPage, Workspace, UpdatePageData } from '../api';
import type { Activity, PageData } from '../types';
import { buildPageIndexes } from '../lib/pageTree';
import { extractPreviewLines } from '../lib/content';
import { blocksToSlate, cleanSlateNode, slateTypeToBlockType } from '../lib/pageContent';
import {
  loadLocalPages,
  saveLocalPages,
  clearLocalPages,
  loadCoverPositions,
  saveCoverPosition,
} from '../lib/localPages';
import type { PageNav } from './usePageNav';
import type { useContentSaver } from './useContentSaver';
import type { useActivities } from './useActivities';

interface UsePagesOptions {
  user: BackendUser | null;
  authLoading: boolean;
  nav: PageNav;
  saver: ReturnType<typeof useContentSaver>;
  activitiesApi: ReturnType<typeof useActivities>;
  // Landing ↔ 工作区外壳切换仍由 App 持有，这里只在登录态切换时通知
  setShowWorkspace: (show: boolean) => void;
}

export function usePages({
  user,
  authLoading,
  nav,
  saver,
  activitiesApi,
  setShowWorkspace,
}: UsePagesOptions) {
  const { addActivity, recordIconChange } = activitiesApi;
  const { scheduleContentSave, scheduleTitleSave, initFromBackend, clearPage, clearAll } = saver;

  const [pages, setPages] = useState<PageData[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [guestPageCount, setGuestPageCount] = useState(0);

  // 会话世代号：登录/登出或重新调用 loadPages 时 +1，使在途加载失效
  const sessionRef = useRef(0);

  // 页面索引：id 直查、父→子映射与树，统一由 lib/pageTree 一次遍历构建，
  // 替代渲染期反复的 find/filter 线性扫描
  const pageIndexes = useMemo(() => buildPageIndexes(pages), [pages]);
  const pagesById = pageIndexes.byId;
  const childrenByParent = pageIndexes.childrenByParent;

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
      const coverPositions = loadCoverPositions();

      // 拉取单个页面的 blocks 并组装 PageData；同时初始化该页的块级同步快照（diff 基线）
      const loadOne = async (bp: BackendPage): Promise<PageData> => {
        const blocks = await blocksApi.list(bp.id);
        const content = blocksToSlate(blocks);
        initFromBackend(bp.id, blocks);
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
      setPages(loadedPages);
      const activePages = loadedPages.filter(p => !p.deletedAt);
      const activePageIds = new Set(activePages.map(p => p.id));
      nav.setActivePageId(currentId => {
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
    // nav.setActivePageId 是 useState setter，引用稳定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initFromBackend]);

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
      nav.setActiveView('home');
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
      nav.reset();
      setWorkspace(null);
      clearAll();
    }

    prevUserRef.current = user;
    // nav 的方法每 render 重建但语义等价；只在登录态切换时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ==========================================
  // 未登录：localStorage 读写
  // ==========================================
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

  // Landing 页"开始使用"进入工作区时加载本地页面
  const loadGuestPages = useCallback(() => {
    const local = loadLocalPages();
    if (local.length > 0) {
      setPages(local);
    }
  }, []);

  // ==========================================
  // 页面操作
  // ==========================================
  const addPage = async (parentId?: string) => {
    // 多块模型：新页只需建页面行，内容块在首次编辑保存时由 diff 同步自动创建
    const emptyContent: Descendant[] = [{ id: uuidv4(), type: 'paragraph', children: [{ text: '' }] } as Element];

    if (user && workspace) {
      try {
        const bp = await pagesApi.create({
          workspace_id: workspace.id,
          parent_id: parentId,
          title: '',
          page_type: 'page',
        });

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
        nav.navigateToNew(bp.id);
        return;
      } catch (err) {
        // 登录态下创建失败不降级到本地，避免产生刷新后即消失的幽灵本地页
        console.error('创建页面失败:', err);
        return;
      }
    }

    // 未登录降级
    const id = uuidv4();
    const now = new Date().toISOString();
    const newPage: PageData = {
      id,
      title: '',
      content: [{ id: uuidv4(), type: 'paragraph', children: [{ text: '' }] } as Element],
      parentId,
      createdAt: now,
      updatedAt: now,
      createdBy: user?.id,
    };
    setPages(prev => [...prev, newPage]);
    addActivity('create', newPage);
    nav.navigateToNew(id);
  };

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
    if (id === nav.activePageId) {
      const nextActive = pages.find(p => !allIds.has(p.id) && !p.deletedAt) || null;
      nav.setActivePageId(nextActive?.id || null);
    }
    nav.removeFromHistory(id);
    // 已登录时同步软删除后端（后端在单个事务中级联软删除整棵子树，无需逐页删后代）
    if (user) {
      pagesApi.delete(id).catch(err => console.error('删除页面失败:', err));
    }
    // nav 的 setter 类方法引用随 render 变化但语义稳定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pages, pagesById, getDescendantIds, nav.activePageId, addActivity]);

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
    // 同步快照一并清除，避免内存泄漏
    allIdsToRemove.forEach(pid => clearPage(pid));
    if (id === nav.activePageId || descendantIds.includes(nav.activePageId || '')) {
      const nextActive = pages.find(p => !allIdsToRemove.has(p.id)) || null;
      nav.setActivePageId(nextActive?.id || null);
    }
    nav.removeFromHistory(id);
    if (user) {
      pagesApi.permanentDelete(id).catch(err => console.error('永久删除页面失败:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pages, getDescendantIds, nav.activePageId]);

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
        recordIconChange(updatedPage, page.icon, newData.icon || undefined);
      } else {
        if (preview === undefined && newData.content) {
          preview = extractPreviewLines(newData.content);
        }
        addActivity(type, updatedPage, preview);
      }
    }

    if (!user) return; // 未登录不调用后端

    try {
      const current = pagesById.get(id);
      if (!current) return;

      // 更新页面基本信息。icon / cover 用 in 判断：调用方显式传 undefined 表示清除，
      // 转为 null 发给后端（exclude_unset 语义下显式 null 会被写入，即置空）
      const metaUpdate: UpdatePageData = {};
      if ('cover' in newData) metaUpdate.cover_image = newData.cover ?? null;
      if (newData.coverPosition !== undefined) metaUpdate.cover_position = newData.coverPosition;
      if ('icon' in newData) metaUpdate.icon = newData.icon ?? null;
      if (Object.keys(metaUpdate).length > 0) {
        await pagesApi.update(id, metaUpdate);
      }
      if (newData.title !== undefined) {
        scheduleTitleSave(id, newData.title);
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
  }, [user, pagesById, addActivity, recordIconChange, scheduleContentSave, scheduleTitleSave]);

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
        // 多块模型：按顶层节点逐块落库（page-link 瞬态块不迁移）
        const nodes = p.content.filter(
          n => Element.isElement(n) && (n as { type?: string }).type !== 'page-link'
        );
        for (let i = 0; i < nodes.length; i++) {
          const node = cleanSlateNode(nodes[i]);
          await blocksApi.create({
            page_id: bp.id,
            block_type: slateTypeToBlockType((node as { type?: string }).type ?? 'paragraph'),
            content: { slate: node },
            position: i,
          });
        }
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
      clearLocalPages();
    }
    setShowMigrationDialog(false);
    setGuestPageCount(0);
    setPages([]);
    nav.setActivePageId(null);
    loadPages(workspace.id);
  };

  const discardLocalPages = () => {
    clearLocalPages();
    setShowMigrationDialog(false);
    setGuestPageCount(0);
    setPages([]);
    nav.setActivePageId(null);
    // 与迁移分支一致：丢弃后重新加载云端页面，避免停留在空白状态
    if (workspace) loadPages(workspace.id);
  };

  return {
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
  };
}
