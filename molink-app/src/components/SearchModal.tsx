import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, FileText } from 'lucide-react';
import { PageIcon } from './IconPicker';
import AnimatedPresence from './AnimatedPresence';
import type { PageData } from '../App';
import { Text as SlateText, Element as SlateElement } from 'slate';

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

function extractText(content: any[]): string {
  let text = '';
  for (const node of content) {
    if (SlateText.isText(node)) {
      text += node.text;
    } else if (SlateElement.isElement(node) && (node as any).children) {
      text += extractText((node as any).children);
    }
  }
  return text;
}

function getContentPreview(content: any[], maxLength: number = 300): string {
  const text = extractText(content).replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

export default function SearchModal({ isOpen, onClose, pages, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const scored: SearchResult[] = [];

    for (const page of pages.filter(p => !p.deletedAt)) {
      const title = (page.title || '').toLowerCase();
      const content = extractText(page.content).toLowerCase();
      let score = 0;
      let preview = '';

      if (title.includes(q)) {
        score += 10;
        const tIdx = title.indexOf(q);
        preview = extractText(page.content).slice(0, 80);
      }
      if (content.includes(q)) {
        score += 5;
        const idx = content.indexOf(q);
        const start = Math.max(0, idx - 30);
        preview = extractText(page.content).slice(start, start + 80);
      }

      if (score > 0) {
        scored.push({ page, score, preview: preview.replace(/\s+/g, ' ') });
      }
    }

    return scored.sort((a, b) => b.score - a.score);
  }, [query, pages]);

  const previewPage = useMemo(() => {
    const idx = hoveredIndex !== null ? hoveredIndex : selectedIndex;
    return results[idx]?.page || null;
  }, [results, hoveredIndex, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
    setHoveredIndex(null);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setHoveredIndex(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      setHoveredIndex(null);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      setHoveredIndex(null);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const result = results[selectedIndex];
      if (result) {
        onNavigate(result.page.id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [results, selectedIndex, onNavigate, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const selectedEl = resultsRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, isOpen]);

  return (
    <AnimatedPresence
      show={isOpen}
      duration={150}
      enterFrom="opacity-0 scale-95"
      enterTo="opacity-100 scale-100"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4"
    >
      {/* 透明遮罩，只拦截点击，不变暗 */}
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative bg-[#1e1e1e]/95 rounded-xl shadow-2xl w-full max-w-[900px] overflow-hidden flex"
        style={{ maxHeight: '65vh', minHeight: '320px' }}
        onKeyDown={handleKeyDown}
      >
        {/* 左侧：搜索 + 结果列表 */}
        <div className="flex-1 flex flex-col min-w-0" style={{ maxWidth: '420px' }}>
          {/* 搜索输入 */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索页面..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-[15px]"
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-muted-foreground bg-muted rounded border border-border">
              ESC
            </kbd>
          </div>

          {/* 结果列表 */}
          <div ref={resultsRef} className="overflow-y-auto flex-1 py-2">
            {results.length === 0 && query.trim() && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                未找到匹配的页面
              </div>
            )}
            {results.length === 0 && !query.trim() && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                输入关键词搜索页面标题和内容
              </div>
            )}
            {results.map((result, idx) => (
              <button
                key={result.page.id}
                onClick={() => {
                  onNavigate(result.page.id);
                  onClose();
                }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === selectedIndex
                    ? 'bg-secondary'
                    : 'hover:bg-accent'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {result.page.icon ? (
                    <PageIcon icon={result.page.icon} size={18} />
                  ) : (
                    <FileText className="w-[18px] h-[18px] text-muted-foreground" />
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
            ))}
          </div>

          {/* 底部提示 */}
          <div className="hidden sm:flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1 bg-muted rounded border border-border">↑</kbd> <kbd className="px-1 bg-muted rounded border border-border">↓</kbd> 选择</span>
              <span><kbd className="px-1 bg-muted rounded border border-border">↵</kbd> 打开</span>
            </div>
            <span>共 {results.length} 个结果</span>
          </div>
        </div>

        {/* 右侧：预览面板 */}
        <div className="w-[1px] bg-border flex-shrink-0" />
        <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a1a]/50 p-5 overflow-y-auto">
          {previewPage ? (
            <div className="flex flex-col gap-3">
              {previewPage.cover && (
                <div className="w-full h-32 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={previewPage.cover}
                    alt="封面"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                {previewPage.icon ? (
                  <PageIcon icon={previewPage.icon} size={20} />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
                <h3 className="text-base font-medium text-foreground">
                  {previewPage.title || '无标题'}
                </h3>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {getContentPreview(previewPage.content, 400)}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              悬停或选择页面以预览内容
            </div>
          )}
        </div>
      </div>
    </AnimatedPresence>
  );
}
