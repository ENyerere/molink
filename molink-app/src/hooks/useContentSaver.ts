// 页面内容/标题的防抖保存队列（原 App.tsx 内的保存子系统）
// 语义：按页面 id 各自维护防抖计时器、单调递增版本号与在途标记；
// 同一页面串行发送，避免快速编辑时并发 PUT 乱序覆盖
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Descendant } from 'slate';
import { pagesApi, blocksApi } from '../api';
import { slateToBlockContent } from '../lib/pageContent';

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

function getContentSaveState(states: Record<string, ContentSaveState>, pageId: string): ContentSaveState {
  if (!states[pageId]) {
    states[pageId] = { version: 0, inFlight: false, retries: 0 };
  }
  return states[pageId];
}

export function useContentSaver(activePageId: string | null) {
  // 顶栏保存状态指示（仅 UI 外显，读写均不影响保存队列）
  const [saveIndicator, setSaveIndicator] = useState<PageSaveIndicator | null>(null);

  const blockIdMap = useRef<Record<string, string>>({}); // pageId -> blockId
  const contentSaveStates = useRef<Record<string, ContentSaveState>>({});
  // 标题保存防抖：pageId -> 定时器 / 最新标题
  const titleTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const titleLatest = useRef<Record<string, string>>({});

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
    blockIdMap,
    scheduleContentSave,
    scheduleTitleSave,
    flushAllContentSaves,
  };
}
