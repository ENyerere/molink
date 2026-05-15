import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Editor as SlateEditor,
  Transforms,
  Element as SlateElement,
} from 'slate';
import { ReactEditor } from 'slate-react';
import type { BlockElementType } from '../BlockElement';

interface SlashCommandMenuProps {
  editor: SlateEditor & ReactEditor;
  query: string;
  onSelect: (type: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

interface MenuItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
  keywords: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    type: 'paragraph',
    label: '文本',
    icon: <span className="text-sm font-medium">T</span>,
    shortcut: '',
    keywords: '文本 text paragraph 段落',
  },
  {
    type: 'heading-one',
    label: '标题 1',
    icon: <span className="text-sm font-bold">H1</span>,
    shortcut: '#',
    keywords: '标题1 h1 heading one 一级标题',
  },
  {
    type: 'heading-two',
    label: '标题 2',
    icon: <span className="text-sm font-bold">H2</span>,
    shortcut: '##',
    keywords: '标题2 h2 heading two 二级标题',
  },
  {
    type: 'heading-three',
    label: '标题 3',
    icon: <span className="text-sm font-bold">H3</span>,
    shortcut: '###',
    keywords: '标题3 h3 heading three 三级标题',
  },
  {
    type: 'heading-four',
    label: '标题 4',
    icon: <span className="text-sm font-bold">H4</span>,
    shortcut: '####',
    keywords: '标题4 h4 heading four 四级标题',
  },
  {
    type: 'bulleted-list',
    label: '项目符号列表',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="opacity-70">
        <rect x="2" y="4" width="3" height="2" rx="0.5" />
        <rect x="7" y="4" width="7" height="2" rx="0.5" />
        <rect x="2" y="9" width="3" height="2" rx="0.5" />
        <rect x="7" y="9" width="7" height="2" rx="0.5" />
      </svg>
    ),
    shortcut: '-',
    keywords: '项目符号列表 bulleted list unordered 无序列表',
  },
  {
    type: 'numbered-list',
    label: '有序列表',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="opacity-70">
        <text x="1" y="7" fontSize="6" fontWeight="bold">1</text>
        <rect x="7" y="4" width="7" height="2" rx="0.5" />
        <rect x="7" y="9" width="7" height="2" rx="0.5" />
      </svg>
    ),
    shortcut: '1.',
    keywords: '有序列表 numbered list ordered 数字列表',
  },
  {
    type: 'todo',
    label: '待办清单',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-70">
        <rect x="2" y="3" width="4.5" height="4.5" rx="1" />
        <line x1="7.5" y1="5.5" x2="14" y2="5.5" />
        <line x1="7.5" y1="10.5" x2="14" y2="10.5" />
      </svg>
    ),
    shortcut: '[]',
    keywords: '待办清单 todo checklist task 任务 复选框',
  },
  {
    type: 'toggle-list',
    label: '折叠列表',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="opacity-70">
        <polygon points="5,4 11,8 5,12" />
        <rect x="7" y="4" width="7" height="2" rx="0.5" />
        <rect x="7" y="9" width="7" height="2" rx="0.5" />
      </svg>
    ),
    shortcut: '>',
    keywords: '折叠列表 toggle list fold 折叠 展开',
  },
  {
    type: 'database',
    label: '数据库',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-70">
        <ellipse cx="8" cy="4" rx="6" ry="2.5" />
        <path d="M2 4v6c0 1.5 2.7 2.5 6 2.5s6-1 6-2.5V4" />
        <path d="M2 8c0 1.5 2.7 2.5 6 2.5s6-1 6-2.5" />
      </svg>
    ),
    shortcut: '',
    keywords: '数据库 database table 表格 view 视图',
  },
];

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().replace(/\s+/g, '');
  let i = 0;
  for (const char of t) {
    if (char === q[i]) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
}

export default function SlashCommandMenu({
  editor,
  query,
  onSelect,
  onClose,
  position,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = useMemo(() => {
    if (!query.trim()) return MENU_ITEMS;
    const q = query.trim();
    return MENU_ITEMS.filter((item) =>
      fuzzyMatch(item.label + ' ' + item.keywords + ' ' + item.shortcut, q)
    );
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el && listRef.current) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[selectedIndex];
        if (item) onSelect(item.type);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) {
    return (
      <div
        className="fixed z-[60] w-72 bg-popover rounded-lg shadow-xl border border-border py-3 px-1"
        style={{ top: position.top, left: position.left }}
      >
        <div className="text-sm text-muted-foreground text-center py-4">
          未找到匹配的命令
        </div>
        <div className="border-t border-border mt-2 pt-2 px-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>关闭菜单</span>
          <span className="text-[10px] opacity-60">esc</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[60] w-72 bg-popover rounded-lg shadow-xl border border-border py-2 overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 pb-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
        基本区块
      </div>
      <div ref={listRef} className="max-h-[320px] overflow-y-auto px-1">
        {filtered.map((item, index) => (
          <button
            key={item.type}
            ref={(el) => { itemRefs.current[index] = el; }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors text-sm ${
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground hover:bg-accent/50'
            }`}
            onClick={() => onSelect(item.type)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-muted-foreground">
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-muted-foreground opacity-60 font-mono">
                {item.shortcut}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="border-t border-border mt-1 pt-1.5 px-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>关闭菜单</span>
        <span className="text-[10px] opacity-60">esc</span>
      </div>
    </div>
  );
}
