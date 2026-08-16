import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import { Search, FileText } from 'lucide-react';
import { PageIcon } from './IconPicker';
import AnimatedPresence from './AnimatedPresence';
import type { PageData } from '../App';
import { Text as SlateText, Element as SlateElement, type Descendant } from 'slate';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageData[];
  onNavigate: (pageId: string) => void;
}

interface SearchResult {
  page: PageData;
  score: number;
  preview: string;
}

function extractText(content: Descendant[]): string {
  let text = '';
  for (const node of content) {
    if (SlateText.isText(node)) {
      text += node.text;
    } else if (SlateElement.isElement(node)) {
      text += extractText(node.children);
    }
  }
  return text;
}

// 页面正文文本缓存：key 为 content 数组引用。
// App.tsx 中页面内容按 Immutable 方式更新，引用变化即自然失效，不会读到过期文本。
const pageTextCache = new WeakMap<Descendant[], string>();

// 取页面正文纯文本（保留原始大小写，供预览截取；匹配处自行转小写）。
// 一次搜索中标题命中、内容命中、预览截取共用同一份文本，避免重复递归遍历 Slate 树。
function getPageText(content: Descendant[]): string {
  const cached = pageTextCache.get(content);
  if (cached !== undefined) return cached;
  const text = extractText(content);
  pageTextCache.set(content, text);
  return text;
}

// 底部快捷键提示
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md border border-border bg-muted px-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export default function SearchModal({ isOpen, onClose, pages, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // 输入框立即响应，搜索结果延迟计算，连续输入更顺滑
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    if (!deferredQuery.trim()) return [];
    const q = deferredQuery.toLowerCase();
    const scored: SearchResult[] = [];

    for (const page of pages.filter(p => !p.deletedAt)) {
      const title = (page.title || '').toLowerCase();
      const pageText = getPageText(page.content);
      const content = pageText.toLowerCase();
      let score = 0;
      let preview = '';

      if (title.includes(q)) {
        score += 10;
        preview = pageText.slice(0, 80);
      }
      if (content.includes(q)) {
        score += 5;
        const idx = content.indexOf(q);
        const start = Math.max(0, idx - 30);
        preview = pageText.slice(start, start + 80);
      }

      if (score > 0) {
        scored.push({ page, score, preview: preview.replace(/\s+/g, ' ') });
      }
    }

    return scored.sort((a, b) => b.score - a.score);
  }, [deferredQuery, pages]);

  // 结果分组：标题命中（score ≥ 10）为「页面」，仅正文命中为「内容匹配」。
  // 打分规则保证标题命中分恒高于仅正文命中，单次遍历分入两组，组内顺序与原排序一致。
  const { titleMatches, contentMatches } = useMemo(() => {
    const titleMatches: SearchResult[] = [];
    const contentMatches: SearchResult[] = [];
    for (const r of results) {
      if (r.score >= 10) titleMatches.push(r);
      else contentMatches.push(r);
    }
    return { titleMatches, contentMatches };
  }, [results]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // 结果集缩小（deferred 值追上输入）时，鼠标悬停旧列表设置的高亮索引可能越界：
  // 及时钳制，保证 Enter 打开的一定是可见且存在的结果
  useEffect(() => {
    setSelectedIndex(idx => Math.min(idx, results.length - 1));
  }, [results.length]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const openResult = useCallback((result: SearchResult) => {
    onNavigate(result.page.id);
    onClose();
  }, [onNavigate, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 中文输入法组词期间不拦截按键（候选词选择、上屏）
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const result = results[selectedIndex];
      if (result) openResult(result);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [results, selectedIndex, openResult, onClose]);

  // 键盘导航时让选中项滚入可视区
  useEffect(() => {
    if (!isOpen) return;
    const selectedEl = resultsRef.current?.querySelector(
      `[data-result-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  // 单条结果行（flatIndex 为跨分组的全局序号，供键盘导航定位）
  const renderRow = (result: SearchResult, flatIndex: number) => (
    <button
      key={result.page.id}
      data-result-index={flatIndex}
      onClick={() => openResult(result)}
      onMouseEnter={() => setSelectedIndex(flatIndex)}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-100 ${
        flatIndex === selectedIndex ? 'bg-accent' : ''
      }`}
    >
      <div className="flex-shrink-0">
        {result.page.icon ? (
          <PageIcon icon={result.page.icon} size={16} />
        ) : (
          <FileText className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {result.page.title || '无标题'}
        </div>
        {result.preview && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {result.preview}
          </div>
        )}
      </div>
    </button>
  );

  return (
    <AnimatedPresence
      show={isOpen}
      duration={220}
      enterFrom="opacity-0 scale-[0.98]"
      enterTo="opacity-100 scale-100"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4"
    >
      {/* 透明遮罩，只拦截点击，不变暗 */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* ⌘K 命令面板：640px、圆角 + shadow-2 + 细边框 */}
      <div
        className="relative w-full max-w-[640px] max-h-[480px] flex flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-2"
        onKeyDown={handleKeyDown}
      >
        {/* 顶部搜索框（图标 + 输入，输入本身无框线） */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border flex-shrink-0">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索页面标题或内容…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {/* 结果区（分组：页面 / 内容匹配） */}
        <div ref={resultsRef} className="flex-1 overflow-y-auto p-2">
          {results.length === 0 && query.trim() && (
            <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              未找到匹配的页面
            </div>
          )}
          {results.length === 0 && !query.trim() && (
            <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              输入关键词搜索页面标题和内容
            </div>
          )}

          {titleMatches.length > 0 && (
            <div>
              <div className="px-3 pt-1.5 pb-1 text-[11px] font-medium text-muted-foreground">
                页面
              </div>
              {titleMatches.map((result, i) => renderRow(result, i))}
            </div>
          )}

          {contentMatches.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">
                内容匹配
              </div>
              {contentMatches.map((result, i) => renderRow(result, titleMatches.length + i))}
            </div>
          )}
        </div>

        {/* 底部快捷键提示栏 */}
        <div className="hidden sm:flex items-center justify-between px-4 h-10 border-t border-border text-xs text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              导航
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd>
              打开
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>esc</Kbd>
              关闭
            </span>
          </div>
          {query.trim() && <span>{results.length} 个结果</span>}
        </div>
      </div>
    </AnimatedPresence>
  );
}
