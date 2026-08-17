// 页面内容/标题的保存队列（多块存储模型）
// 语义：按页面 id 各自维护防抖计时器、单调递增版本号与在途标记；
// flush 时对顶层块做快照 diff，按 create → update → delete → reorder 顺序落库，
// 只有内容/类型/顺序发生变化的块才会发请求
import { useState, useEffect, useCallback, useRef } from 'react';
import { Element, type Descendant } from 'slate';
import { pagesApi, blocksApi } from '../api';
import type { BackendBlock } from '../api';
import {
  cleanSlateNode,
  isLegacySingleBlockDoc,
  slateTypeToBlockType,
} from '../lib/pageContent';

// 内容保存状态：按页面 id 各自维护防抖计时器、单调递增版本号与在途标记
interface ContentSaveState {
  timer?: ReturnType<typeof setTimeout>;
  version: number;
  inFlight: boolean;
  pendingContent?: Descendant[];
  retries: number;
}

// 顶栏保存状态指示：记录最近一次调度/完成保存的页面与时间，仅供 UI 读取，与保存队列语义解耦
export interface PageSaveIndicator {
  pageId: string;
  status: 'saving' | 'saved';
  savedAt?: number;
}

// 单个块的同步快照：slate 节点 id → 后端行
interface BlockSnapshotEntry {
  backendId: string;
  hash: string;
}

interface PageSnapshot {
  byId: Map<string, BlockSnapshotEntry>;
  /** 上次同步完成后的后端 block id 顺序 */
  order: string[];
  /** 待删除的后端块（旧版整篇块 / 上次 flush 中断遗留） */
  pendingDeletes: string[];
}

function getContentSaveState(states: Record<string, ContentSaveState>, pageId: string): ContentSaveState {
  if (!states[pageId]) {
    states[pageId] = { version: 0, inFlight: false, retries: 0 };
  }
  return states[pageId];
}

function emptySnapshot(): PageSnapshot {
  return { byId: new Map(), order: [], pendingDeletes: [] };
}

// 快照哈希口径：剥离瞬态字段后的节点 JSON。未变更的块在 Slate 不可变更新下保持
// 对象身份与键序不变，因此哈希稳定；内容/类型变化必然导致哈希变化
function hashNode(node: Descendant): string {
  return JSON.stringify(cleanSlateNode(node));
}

// 取出参与持久化的顶层块：page-link 是渲染期瞬态块，不落库
function persistableTopLevel(content: Descendant[]): Descendant[] {
  return content.filter(
    n => Element.isElement(n) && (n as { type?: string }).type !== 'page-link'
  );
}

export function useContentSaver(activePageId: string | null) {
  // 顶栏保存状态指示（仅 UI 外显，读写均不影响保存队列）
  const [saveIndicator, setSaveIndicator] = useState<PageSaveIndicator | null>(null);

  const contentSaveStates = useRef<Record<string, ContentSaveState>>({});
  const snapshots = useRef<Record<string, PageSnapshot>>({});
  // 标题保存防抖：pageId -> 定时器 / 最新标题
  const titleTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const titleLatest = useRef<Record<string, string>>({});

  // 页面加载后初始化同步快照（diff 基线）
  const initFromBackend = useCallback((pageId: string, blocks: BackendBlock[]) => {
    if (isLegacySingleBlockDoc(blocks)) {
      // 旧版整篇存储：快照为空 + 旧块记入待删，首次内容保存时整体迁移为多块
      snapshots.current[pageId] = {
        byId: new Map(),
        order: [],
        pendingDeletes: [blocks[0].id],
      };
      return;
    }
    const byId = new Map<string, BlockSnapshotEntry>();
    const order: string[] = [];
    for (const b of blocks) {
      const raw = b.content?.slate;
      const node =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? ({ ...(raw as Record<string, unknown>), id: b.id } as unknown as Descendant)
          : ({ id: b.id, type: 'paragraph', children: [{ text: '' }] } as unknown as Descendant);
      byId.set(b.id, { backendId: b.id, hash: hashNode(node) });
      order.push(b.id);
    }
    snapshots.current[pageId] = { byId, order, pendingDeletes: [] };
  }, []);

  const clearPage = useCallback((pageId: string) => {
    delete snapshots.current[pageId];
    delete contentSaveStates.current[pageId];
  }, []);

  // 登出时整体清理
  const clearAll = useCallback(() => {
    snapshots.current = {};
    contentSaveStates.current = {};
  }, []);

  // 发送指定页面的最新待保存内容（同一页面串行执行，避免并发写乱序覆盖）
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

    const snap = snapshots.current[pageId] ?? (snapshots.current[pageId] = emptySnapshot());

    try {
      const nodes = persistableTopLevel(content);
      const currentIds = new Set<string>();
      // (slateId → 清洗后节点) 按文档顺序
      const prepared: { slateId: string; node: Descendant; hash: string }[] = [];
      for (const raw of nodes) {
        const slateId = (raw as { id?: string }).id;
        if (!slateId) {
          // withBlockIds 插件应保证 id 存在；兜底跳过并告警，不丢其他块
          console.error('保存页面内容失败：顶层块缺少 id，已跳过该块');
          continue;
        }
        currentIds.add(slateId);
        const node = cleanSlateNode(raw);
        prepared.push({ slateId, node, hash: JSON.stringify(node) });
      }

      // 1) 创建：快照中不存在的块。串行执行——后续 reorder 需要拿到全部 backendId
      for (let i = 0; i < prepared.length; i++) {
        const { slateId, node, hash } = prepared[i];
        if (snap.byId.has(slateId)) continue;
        const created = await blocksApi.create({
          page_id: pageId,
          block_type: slateTypeToBlockType((node as { type?: string }).type ?? 'paragraph'),
          content: { slate: node },
          position: i,
        });
        snap.byId.set(slateId, { backendId: created.id, hash });
      }

      // 2) 更新：哈希变化的块（并行）
      const updates = prepared
        .filter(({ slateId, hash }) => {
          const entry = snap.byId.get(slateId);
          return entry && entry.hash !== hash;
        })
        .map(async ({ slateId, node, hash }) => {
          const entry = snap.byId.get(slateId)!;
          await blocksApi.update(entry.backendId, {
            block_type: slateTypeToBlockType((node as { type?: string }).type ?? 'paragraph'),
            content: { slate: node },
          });
          entry.hash = hash;
        });
      await Promise.all(updates);

      // 3) 删除：快照里存在但文档中已消失的块 + 遗留待删（旧版整篇块）
      const deleteIds: string[] = [...snap.pendingDeletes];
      for (const [slateId, entry] of snap.byId) {
        if (!currentIds.has(slateId)) {
          deleteIds.push(entry.backendId);
          snap.byId.delete(slateId);
        }
      }
      snap.pendingDeletes = [];
      await Promise.all(deleteIds.map(id => blocksApi.delete(id)));

      // 4) 重排：文档顺序与上次同步顺序不一致时整页 reorder
      const desiredOrder = prepared
        .map(({ slateId }) => snap.byId.get(slateId)?.backendId)
        .filter((id): id is string => !!id);
      if (
        desiredOrder.length > 0 &&
        (desiredOrder.length !== snap.order.length ||
          desiredOrder.some((id, i) => snap.order[i] !== id))
      ) {
        await blocksApi.reorder(pageId, desiredOrder);
        snap.order = desiredOrder;
      }
    } catch (err) {
      console.error('保存页面内容失败:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      // 401 是登录态失效，重试无意义（由 auth_expired 流程接管）；
      // 其他失败把内容放回待保存队列并做有限次退避重试，避免静默丢数据。
      // 快照按 op 粒度实时更新，重试只会补发未完成的操作
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

  // 标题保存防抖：本地状态已即时更新，网络请求按页合并，避免每敲一键就发一次 PUT
  const scheduleTitleSave = useCallback((pageId: string, title: string) => {
    titleLatest.current[pageId] = title;
    const existing = titleTimers.current[pageId];
    if (existing) clearTimeout(existing);
    titleTimers.current[pageId] = setTimeout(() => {
      const latest = titleLatest.current[pageId];
      if (latest === undefined) return;
      pagesApi.update(pageId, { title: latest }).catch(err => {
        console.error('保存页面标题失败:', err);
      });
    }, 500);
  }, []);

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

  return {
    saveIndicator,
    initFromBackend,
    clearPage,
    clearAll,
    scheduleContentSave,
    scheduleTitleSave,
    flushAllContentSaves,
  };
}
