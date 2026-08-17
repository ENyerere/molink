import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Type, Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, ListTodo, ListCollapse,
  TextQuote, Code, Database,
  type LucideIcon,
} from 'lucide-react';

interface SlashCommandMenuProps {
  query: string;
  onSelect: (type: string) => void;
  onClose: () => void;
  // 可选：菜单顶部过滤框直接修改关键词（编辑器内输入仍走原 onChange 检测）
  onQueryChange?: (query: string) => void;
  position: { top: number; left: number };
}

// 分组（§5.2）：基础 / 高级；媒体组暂无对应块类型，预留不渲染空组
const GROUPS = ['基础', '高级'] as const;

interface MenuItem {
  type: string;
  label: string;
  icon: LucideIcon;
  shortcut: string;
  keywords: string;
  group: (typeof GROUPS)[number];
}

const MENU_ITEMS: MenuItem[] = [
  { type: 'paragraph', label: '文本', icon: Type, shortcut: '', keywords: '文本 text paragraph 段落', group: '基础' },
  { type: 'heading-one', label: '标题 1', icon: Heading1, shortcut: '#', keywords: '标题1 h1 heading one 一级标题', group: '基础' },
  { type: 'heading-two', label: '标题 2', icon: Heading2, shortcut: '##', keywords: '标题2 h2 heading two 二级标题', group: '基础' },
  { type: 'heading-three', label: '标题 3', icon: Heading3, shortcut: '###', keywords: '标题3 h3 heading three 三级标题', group: '基础' },
  { type: 'heading-four', label: '标题 4', icon: Heading4, shortcut: '####', keywords: '标题4 h4 heading four 四级标题', group: '基础' },
  { type: 'bulleted-list', label: '项目符号列表', icon: List, shortcut: '-', keywords: '项目符号列表 bulleted list unordered 无序列表', group: '基础' },
  { type: 'numbered-list', label: '有序列表', icon: ListOrdered, shortcut: '1.', keywords: '有序列表 numbered list ordered 数字列表', group: '基础' },
  { type: 'todo', label: '待办清单', icon: ListTodo, shortcut: '[]', keywords: '待办清单 todo checklist task 任务 复选框', group: '基础' },
  { type: 'toggle-list', label: '折叠列表', icon: ListCollapse, shortcut: '>>', keywords: '折叠列表 toggle list fold 折叠 展开', group: '基础' },
  { type: 'blockquote', label: '引用', icon: TextQuote, shortcut: '>', keywords: '引用 quote blockquote 引述', group: '高级' },
  { type: 'code-block', label: '代码块', icon: Code, shortcut: '```', keywords: '代码块 code 代码 fence', group: '高级' },
  { type: 'database', label: '数据库', icon: Database, shortcut: '', keywords: '数据库 database table 表格 view 视图', group: '高级' },
];

// fuzzyMatch 查询词的空白剥离正则：提升到模块级，避免每次匹配重建字面量
const WHITESPACE_RE = /\s+/g;

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().replace(WHITESPACE_RE, '');
  let i = 0;
  for (const char of t) {
    if (char === q[i]) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
}

// 行类型：分组标题或菜单项（index 为跨分组的扁平序号，供键盘导航与滚动定位）
type MenuRow =
  | { kind: 'header'; name: string }
  | { kind: 'item'; item: MenuItem; index: number };

export default function SlashCommandMenu({
  query,
  onSelect,
  onClose,
  onQueryChange,
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

  // 按分组展开为渲染行，空分组不渲染
  const rows = useMemo(() => {
    const r: MenuRow[] = [];
    let index = 0;
    for (const g of GROUPS) {
      const items = filtered.filter((i) => i.group === g);
      if (items.length === 0) continue;
      r.push({ kind: 'header', name: g });
      for (const item of items) {
        r.push({ kind: 'item', item, index });
        index += 1;
      }
    }
    return r;
  }, [filtered]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el && listRef.current) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // 键盘监听只绑定一次：最新状态经 ref 读取，避免每次按键/过滤变化都重绑 document 监听
  const stateRef = useRef({ filtered, selectedIndex, onSelect, onClose });
  useEffect(() => {
    stateRef.current = { filtered, selectedIndex, onSelect, onClose };
  }, [filtered, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 中文输入法组词期间不拦截按键（候选词选择、上屏）
      if (e.isComposing) return;
      const { filtered, selectedIndex, onSelect, onClose } = stateRef.current;
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
  }, []);

  if (filtered.length === 0) {
    return (
      <div
        className="fixed z-popover w-80 bg-popover rounded-lg shadow-1 border border-border py-3 px-1"
        style={{ top: position.top, left: position.left }}
      >
        <div className="text-sm text-muted-foreground text-center py-4">
          未找到匹配的命令
        </div>
        <div className="border-t border-border mt-2 pt-2 px-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>关闭菜单</span>
          <span className="text-micro opacity-60">esc</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-popover w-80 bg-popover rounded-lg shadow-1 border border-border overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {/* 顶部过滤框：默认焦点仍在编辑器（输入即过滤），点击此处也可直接改关键词 */}
      <div className="border-b border-border px-3 py-2">
        <input
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          placeholder="输入以过滤…"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div ref={listRef} className="max-h-[320px] overflow-y-auto px-1 py-1">
        {rows.map((row) =>
          row.kind === 'header' ? (
            <div
              key={`header-${row.name}`}
              className="px-3 pb-1 pt-2 text-caption text-muted-foreground font-medium uppercase tracking-wide"
            >
              {row.name}
            </div>
          ) : (
            <button
              key={row.item.type}
              ref={(el) => { itemRefs.current[row.index] = el; }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors text-sm ${
                row.index === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-accent/50'
              }`}
              onClick={() => onSelect(row.item.type)}
              onMouseEnter={() => setSelectedIndex(row.index)}
            >
              <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                <row.item.icon className="w-4 h-4" strokeWidth={1.75} />
              </span>
              <span className="flex-1">{row.item.label}</span>
              {row.item.shortcut && (
                <span className="text-xs text-muted-foreground/60 font-mono">
                  {row.item.shortcut}
                </span>
              )}
            </button>
          )
        )}
      </div>
      <div className="border-t border-border mt-1 pt-1.5 px-3 pb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>关闭菜单</span>
        <span className="text-micro opacity-60">esc</span>
      </div>
    </div>
  );
}
