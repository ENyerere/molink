import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Editor from './Editor';
import { v4 as uuidv4 } from 'uuid';
import type { Descendant, Element } from 'slate';

export interface PageData {
  id: string;
  title: string;
  content: Descendant[];
  cover?: string; // 新增，用于存封面图片 URL
}

export default function App() {
  const [pages, setPages] = useState<PageData[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [backStack, setBackStack] = useState<string[]>([]);
  const [forwardStack, setForwardStack] = useState<string[]>([]);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 监听激活页变化自动滚动标签
  useEffect(() => {
    if (activePageId && tabRefs.current[activePageId]) {
      tabRefs.current[activePageId]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [activePageId]);

  // 初始化加载数据，如果没有页面则自动创建
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
  }, []);

  // 数据持久化
  useEffect(() => {
    localStorage.setItem('molink-pages', JSON.stringify(pages));
  }, [pages]);

  // 新建页面（带历史记录）
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

  // 点击标签时激活页面（带历史记录）
  const activatePage = (id: string) => {
    if (id === activePageId) return;
    if (activePageId) setBackStack(prev => [...prev, activePageId]);
    setForwardStack([]);
    setActivePageId(id);
  };

  // 关闭页面
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

  // 后退
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

  // 前进
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

  // 更新页面
  const updatePage = (id: string, newData: Partial<PageData>) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...newData } : p));
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        pages={pages}
        activePageId={activePageId}
        setActivePageId={setActivePageId}
        addPage={addPage}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 标签栏 */}
        <div className="flex items-center bg-gray-100 border-b px-2 h-10 gap-1">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className={`px-2 py-1 rounded ${!canGoBack ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-200'}`}
            title="后退"
          >
            ←
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className={`px-2 py-1 rounded ${!canGoForward ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-200'}`}
            title="前进"
          >
            →
          </button>

          {/* 标签区 */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-center gap-1">
              {pages.map(p => (
                <div
                  key={p.id}
                  ref={el => { tabRefs.current[p.id] = el; }}
                  className={`flex items-center px-3 py-1 whitespace-nowrap rounded-t-md border group
                  ${p.id === activePageId
                      ? 'bg-white font-semibold border-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 border-transparent'}`}
                >
                  <span
                    onClick={() => activatePage(p.id)}
                    className="cursor-pointer"
                  >
                    {p.title || '无标题'}
                  </span>
                  <button
                    onClick={() => closePage(p.id)}
                    className="ml-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    title="关闭"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* 新建按钮 */}
              <button
                onClick={addPage}
                className="ml-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                title="新建页面"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* 编辑区 */}
        <div className="flex-1 overflow-auto">
          {activePageId && (
            <Editor
              page={pages.find(p => p.id === activePageId)!}
              updatePage={updatePage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
