import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  createEditor,
  Editor as SlateEditor,
  Transforms,
  Element as SlateElement,
  Node,
  Range,
  Path,
  type Descendant,
} from 'slate';
import {
  Slate,
  Editable,
  withReact,
  ReactEditor,
} from 'slate-react';
import type { PageData } from './App';
import { withMarkdownShortcuts } from './withMarkdownShortcuts';
import BlockElement, { type BlockElementType } from './BlockElement';
import Leaf from './Leaf';

import { Smile, Image, MessageSquare, MoveVertical, RotateCcw, Trash2 } from 'lucide-react';
import IconPicker, { PageIcon } from './components/IconPicker';
import SlashCommandMenu from './components/SlashCommandMenu';

const COVER_VH = 30;
const TOP_MARGIN_PX = 60;
const NO_COVER_PX = 120;

// 块类型 ↔ 文本标记前缀
const BLOCK_PREFIXES: Record<string, string> = {
  'heading-one': '# ',
  'heading-two': '## ',
  'heading-three': '### ',
  'heading-four': '#### ',
  'bulleted-list': '- ',
  'numbered-list': '1. ',
  'toggle-list': '>> ',
  'blockquote': '> ',
};

function serializeBlocks(blocks: any[]): string {
  return blocks
    .map((block) => {
      const text = block.children.map((c: any) => c.text).join('').replace(/\n/g, ' ');
      if (block.type === 'todo') {
        const prefix = block.checked ? '- [x] ' : '- [ ] ';
        return prefix + text;
      }
      const prefix = BLOCK_PREFIXES[block.type] || '';
      return prefix + text;
    })
    .join('\n');
}

// 覆盖 Slate React 的 setFragmentData：当选中块存在时，直接写入带标记纯文本
const originalSetFragmentData = ReactEditor.setFragmentData.bind(ReactEditor);
ReactEditor.setFragmentData = (editor, data, origin) => {
  const selected: any[] = [];
  for (const [node] of SlateEditor.nodes(editor, {
    at: [],
    match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n) && (n as BlockElementType).selected,
  })) {
    selected.push(node);
  }
  if (selected.length > 0 && (origin === 'copy' || origin === 'cut')) {
    const text = serializeBlocks(selected);
    data.setData('text/plain', text);
    data.setData('text/html', '');
  } else {
    originalSetFragmentData(editor, data, origin);
  }
};

function parseClipboardText(text: string): any[] {
  const lines = text.split('\n');
  const blocks: any[] = [];

  for (const line of lines) {
    const trimmed = line.trimStart();
    // 顺序很重要：先匹配更长的前缀
    if (trimmed.startsWith('- [x] ')) {
      blocks.push({ type: 'todo', checked: true, children: [{ text: trimmed.slice(6) }] });
    } else if (trimmed.startsWith('- [ ] ')) {
      blocks.push({ type: 'todo', checked: false, children: [{ text: trimmed.slice(6) }] });
    } else if (trimmed.startsWith('#### ')) {
      blocks.push({ type: 'heading-four', children: [{ text: trimmed.slice(5) }] });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'heading-three', children: [{ text: trimmed.slice(4) }] });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading-two', children: [{ text: trimmed.slice(3) }] });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading-one', children: [{ text: trimmed.slice(2) }] });
    } else if (trimmed.startsWith('>> ')) {
      blocks.push({ type: 'toggle-list', children: [{ text: trimmed.slice(3) }] });
    } else if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'blockquote', children: [{ text: trimmed.slice(2) }] });
    } else if (trimmed.startsWith('- ')) {
      blocks.push({ type: 'bulleted-list', children: [{ text: trimmed.slice(2) }] });
    } else if (trimmed.startsWith('1. ')) {
      blocks.push({ type: 'numbered-list', children: [{ text: trimmed.slice(3) }] });
    } else {
      blocks.push({ type: 'paragraph', children: [{ text: line }] });
    }
  }

  return blocks;
}

export default function Editor({
  page,
  childPages,
  updatePage,
  uploadCover,
  onActivatePage,
  restorePage,
  permanentDeletePage,
}: {
  page: PageData;
  childPages: PageData[];
  updatePage: (id: string, newData: Partial<PageData>) => void;
  uploadCover: (pageId: string, file: File) => Promise<string | null>;
  onActivatePage?: (id: string) => void;
  restorePage?: (id: string) => void;
  permanentDeletePage?: (id: string) => void;
}) {
  const editor = useMemo(() => withMarkdownShortcuts(withReact(createEditor())), []);
  const isSyncingRef = useRef(false);

  const [coverPx, setCoverPx] = useState<number>(
    page.cover ? Math.round(window.innerHeight * (COVER_VH / 100)) : NO_COVER_PX
  );
  const [textTopOffset, setTextTopOffset] = useState<number>(
    page.cover
      ? Math.round(window.innerHeight * (COVER_VH / 100)) + TOP_MARGIN_PX + 60
      : NO_COVER_PX
  );

  // 封面位置调整（object-position 的 y 百分比）
  const initialPos = page.coverPosition ?? 50;
  const [coverPosY, setCoverPosY] = useState(initialPos);
  const [savedCoverPosY, setSavedCoverPosY] = useState(initialPos);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const coverRef = useRef<HTMLDivElement | null>(null);

  // —— Slash 命令菜单 ——
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuQuery, setSlashMenuQuery] = useState('');
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });


  const slashMenuOpenRef = useRef(false);
  useEffect(() => { slashMenuOpenRef.current = slashMenuOpen; }, [slashMenuOpen]);

  // 菜单位置：在 DOM 更新后计算，确保能拿到正确的块级节点位置
  useEffect(() => {
    if (!slashMenuOpen) return;
    const raf = requestAnimationFrame(() => {
      const { selection } = editor;
      if (!selection) return;
      const blockEntry = SlateEditor.above(editor, {
        match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
      });
      if (!blockEntry) return;
      const [block] = blockEntry;
      try {
        const domNode = ReactEditor.toDOMNode(editor as ReactEditor, block as SlateElement);
        const rect = domNode.getBoundingClientRect();
        setSlashMenuPos({ top: rect.bottom + 4, left: rect.left });
      } catch {}
    });
    return () => cancelAnimationFrame(raf);
  }, [slashMenuOpen, slashMenuQuery, editor]);

  const handleSlashSelect = (type: string) => {
    const { selection } = editor;
    if (!selection) {
      setSlashMenuOpen(false);
      return;
    }
    SlateEditor.withoutNormalizing(editor, () => {
      const blockEntry = SlateEditor.above(editor, {
        match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
      });
      if (!blockEntry) return;
      const [, path] = blockEntry;

      if (type === 'database') {
        // 数据库块：替换当前块为数据库块
        Transforms.removeNodes(editor, { at: path });
        const dbBlock: BlockElementType = {
          type: 'database',
          children: [{ text: '' }],
          columns: [
            { id: 'col_1', name: '名称', type: 'text' },
            { id: 'col_2', name: '状态', type: 'select', options: ['待办', '进行中', '已完成'] },
          ],
          rows: [],
        };
        Transforms.insertNodes(editor, dbBlock as any, { at: path });
        setSlashMenuOpen(false);
        return;
      }

      // 选中并删除当前块内所有文本（包括 / 和搜索词）
      const blockStart = SlateEditor.start(editor, path);
      const blockEnd = SlateEditor.end(editor, path);
      Transforms.select(editor, { anchor: blockStart, focus: blockEnd });
      Transforms.delete(editor);
      // 设置新块类型
      const newProps: Partial<BlockElementType> = { type: type as any };
      if (type === 'todo') newProps.checked = false;
      Transforms.setNodes(editor, newProps, { at: path });
    });
    setSlashMenuOpen(false);
  };

  // 页面切换时同步封面位置
  useEffect(() => {
    const pos = page.coverPosition ?? 50;
    setCoverPosY(pos);
    setSavedCoverPosY(pos);
    setIsRepositioning(false);
  }, [page.id, page.coverPosition]);

  const recomputeOffsets = useCallback(() => {
    const px = page.cover
      ? Math.round(window.innerHeight * (COVER_VH / 100))
      : NO_COVER_PX;
    setCoverPx(px);
    // 有封面时：有图标需要 60px margin，无图标只需要 20px margin
    const extraMargin = page.cover ? (page.icon ? TOP_MARGIN_PX : 20) : 0;
    setTextTopOffset(px + extraMargin);
  }, [page.cover, page.icon]);

  useEffect(() => {
    recomputeOffsets();
  }, [recomputeOffsets]);

  useEffect(() => {
    const onResize = () => recomputeOffsets();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recomputeOffsets]);

  const handleChange = useCallback(
    (value: Descendant[]) => {
      if (isSyncingRef.current) return;
      // 内容未变化则跳过（防止 updatePage 后 Slate 二次触发 onChange）
      if (JSON.stringify(page.content) === JSON.stringify(value)) return;

      // Slash 命令菜单检测（在 onChange 中检测比 onKeyDown 更可靠）
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        const blockEntry = SlateEditor.above(editor, {
          match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
        });
        if (blockEntry) {
          const [block] = blockEntry;
          if (block.type === 'paragraph') {
            const text = block.children.map((c: any) => c.text).join('');
            if (text.startsWith('/')) {
              if (!slashMenuOpenRef.current) {
                setSlashMenuOpen(true);
              }
              setSlashMenuQuery(text.slice(1));
            } else if (slashMenuOpenRef.current) {
              setSlashMenuOpen(false);
            }
          } else if (slashMenuOpenRef.current) {
            setSlashMenuOpen(false);
          }
        } else if (slashMenuOpenRef.current) {
          setSlashMenuOpen(false);
        }
      } else if (slashMenuOpenRef.current) {
        setSlashMenuOpen(false);
      }

      // 比较新旧内容，推断变更类型
      const oldTexts = page.content.map((node: any) =>
        node.children ? node.children.map((c: any) => c.text || '').join('') : (node.text || '')
      );
      const newTexts = value.map((node: any) =>
        node.children ? node.children.map((c: any) => c.text || '').join('') : (node.text || '')
      );
      const added = newTexts.filter((t: string) => !oldTexts.includes(t));
      const removed = oldTexts.filter((t: string) => !newTexts.includes(t));

      // 无新增/删除块：可能是纯重排序或纯编辑
      if (added.length === 0 && removed.length === 0) {
        const changed = newTexts.filter((t: string, i: number) => oldTexts[i] !== t);
        if (changed.length === 0) {
          // 纯重排序，不添加活动
          updatePage(page.id, { content: value }, null);
          return;
        }
        // 纯编辑，只提取变化的块
        updatePage(page.id, { content: value }, 'edit', changed.join('\n'));
        return;
      }

      if (added.length === 1 && removed.length === 0) {
        updatePage(page.id, { content: value }, 'block-add', added[0]);
        return;
      }
      if (removed.length === 1 && added.length === 0) {
        updatePage(page.id, { content: value }, 'block-delete', removed[0]);
        return;
      }

      // 多块变更或其他复杂变更
      const changed = newTexts.filter((t: string, i: number) => oldTexts[i] !== t);
      const preview = changed.length > 0 ? changed.join('\n') : undefined;
      updatePage(page.id, { content: value }, 'edit', preview);
    },
    [page.id, page.content, updatePage, editor]
  );

  // 同步 page-link 块到 Slate 内容
  const childPageIdsKey = useMemo(() => childPages.map(c => c.id).join(','), [childPages]);

  useEffect(() => {
    if (!editor || childPages.length === 0) return;

    const existing = Array.from(SlateEditor.nodes(editor, {
      at: [],
      match: (n) => SlateElement.isElement(n) && n.type === 'page-link',
    }));

    const neededIds = childPages.map(c => c.id);
    const existingIds = existing.map(([n]) => (n as any).pageId);

    const needsSync =
      neededIds.length !== existingIds.length ||
      !neededIds.every((id, i) => id === existingIds[i]);

    if (!needsSync) return;

    isSyncingRef.current = true;

    SlateEditor.withoutNormalizing(editor, () => {
      // 从后往前移除所有 page-link
      for (let i = existing.length - 1; i >= 0; i--) {
        const [, path] = existing[i];
        Transforms.removeNodes(editor, { at: path });
      }

      // 在末尾插入新的 page-link
      for (const child of childPages) {
        Transforms.insertNodes(editor, {
          type: 'page-link',
          pageId: child.id,
          children: [{ text: '' }],
        } as any);
      }
    });

    // 延迟重置标志，跳过这次触发的 onChange
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [editor, childPageIdsKey, childPages]);

  // 封面上传处理
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadCover(page.id, file);
    if (url) {
      updatePage(page.id, { cover: url, coverPosition: 50 });
      setCoverPosY(50);
      setSavedCoverPosY(50);
    }
  };

  // 进入调整位置模式
  const enterRepositionMode = () => {
    setSavedCoverPosY(coverPosY);
    setIsRepositioning(true);
  };

  // 保存位置
  const savePosition = () => {
    setSavedCoverPosY(coverPosY);
    setIsRepositioning(false);
    updatePage(page.id, { coverPosition: coverPosY });
  };

  // 取消调整
  const cancelReposition = () => {
    setCoverPosY(savedCoverPosY);
    setIsRepositioning(false);
  };

  // 封面位置调整拖动
  const handleCoverDrag = (e: React.MouseEvent) => {
    if (!isRepositioning) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startPos = coverPosY;

    const onMouseMove = (ev: MouseEvent) => {
      if (!coverRef.current) return;
      const rect = coverRef.current.getBoundingClientRect();
      const deltaY = ev.clientY - startY;
      const deltaPercent = (deltaY / rect.height) * 100;
      const newPos = Math.max(0, Math.min(100, startPos + deltaPercent));
      setCoverPosY(newPos);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'ns-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // —— 框选逻辑 ——
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragSelecting, setDragSelecting] = useState(false);
  const selectionRectRef = useRef<HTMLDivElement | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const prevSelectedDOMsRef = useRef<Set<HTMLElement>>(new Set());

  // 直接操作 DOM 更新框选矩形，避免 React re-render 导致的掉帧
  const updateSelectionRectDOM = useCallback(
    (rect: { left: number; top: number; width: number; height: number } | null) => {
      const el = selectionRectRef.current;
      if (!el) return;
      if (!rect) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'block';
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
    },
    []
  );

  useEffect(() => {
    if (!dragSelecting) return;

    document.body.style.userSelect = 'none';
    hasDraggedRef.current = false;

    // 框选开始时，清除所有之前的选中状态（DOM + Slate）
    SlateEditor.withoutNormalizing(editor, () => {
      for (const [node, path] of SlateEditor.nodes(editor, {
        at: [],
        match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
      })) {
        try {
          const dom = ReactEditor.toDOMNode(editor as ReactEditor, node as SlateElement);
          delete (dom as HTMLElement).dataset.blockSelected;
        } catch {}
        if ((node as BlockElementType).selected) {
          Transforms.setNodes<BlockElementType>(editor, { selected: false }, { at: path });
        }
      }
    });
    prevSelectedDOMsRef.current.clear();

    // mousedown 时缓存所有块的 DOM + rect
    const blockEntries: { path: number[]; dom: HTMLElement; rect: DOMRect }[] = [];
    for (const [node, path] of SlateEditor.nodes(editor, {
      at: [],
      match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
    })) {
      try {
        const dom = ReactEditor.toDOMNode(editor as ReactEditor, node as SlateElement);
        blockEntries.push({ path, dom: dom as HTMLElement, rect: dom.getBoundingClientRect() });
      } catch {}
    }

    let rafId: number | null = null;
    let lastEvent: MouseEvent | null = null;

    const tick = () => {
      rafId = null;
      const e = lastEvent;
      if (!e || !startPos.current || !containerRef.current) return;

      const cx = e.clientX,
        cy = e.clientY,
        sx = startPos.current.x,
        sy = startPos.current.y;
      const dx = Math.abs(cx - sx);
      const dy = Math.abs(cy - sy);
      if (dx < 4 && dy < 4) return;

      hasDraggedRef.current = true;
      const cr = containerRef.current.getBoundingClientRect();
      const left = Math.min(cx, sx) - cr.left;
      const top = Math.min(cy, sy) - cr.top;
      const width = Math.abs(cx - sx);
      const height = Math.abs(cy - sy);
      updateSelectionRectDOM({ left, top, width, height });

      const rectViewport = {
        left: Math.min(cx, sx),
        right: Math.max(cx, sx),
        top: Math.min(cy, sy),
        bottom: Math.max(cy, sy),
      };

      // 先清除上一次 tick 中设置的所有选中
      for (const dom of prevSelectedDOMsRef.current) {
        delete dom.dataset.blockSelected;
      }
      prevSelectedDOMsRef.current.clear();

      // 直接操作 DOM，完全不经过 React / Slate，避免 re-render
      for (const { dom, rect } of blockEntries) {
        const overlap =
          rectViewport.left < rect.right &&
          rectViewport.right > rect.left &&
          rectViewport.top < rect.bottom &&
          rectViewport.bottom > rect.top;
        if (overlap) {
          dom.dataset.blockSelected = 'true';
          prevSelectedDOMsRef.current.add(dom);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      lastEvent = e;
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const onMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setDragSelecting(false);
      updateSelectionRectDOM(null);

      // 把 DOM 状态同步回 Slate
      if (hasDraggedRef.current) {
        SlateEditor.withoutNormalizing(editor, () => {
          for (const { dom, path } of blockEntries) {
            const selected = dom.dataset.blockSelected === 'true';
            Transforms.setNodes<BlockElementType>(editor, { selected }, { at: path });
          }
        });

        // 阻止框选释放后可能触发的 click 事件到达块根元素的 onClick，避免 selected 被清掉
        const stopClick = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-slate-block]')) {
            e.stopImmediatePropagation();
          }
          document.removeEventListener('click', stopClick, true);
        };
        document.addEventListener('click', stopClick, true);
      }

      startPos.current = null;
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
    };
  }, [dragSelecting, editor, updateSelectionRectDOM]);

  // 隐藏的文件输入
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const iconTriggerRef = useRef<HTMLButtonElement>(null);
  const addIconTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative min-h-full"
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        // 在块内容区域内不启动框选
        const target = e.target as HTMLElement;
        if (target.closest('[data-slate-block]')) return;
        // 在输入框/按钮上时不拦截焦点
        if (target.closest('input, textarea, button, [contenteditable="true"]')) return;
        // 把焦点移回编辑器并阻止浏览器改焦点，确保后续 copy 事件在 Editable 上触发
        const editableEl = ReactEditor.toDOMNode(editor as ReactEditor, editor);
        (editableEl as HTMLElement)?.focus();
        e.preventDefault();
        startPos.current = { x: e.clientX, y: e.clientY };
        setDragSelecting(true);
      }}
    >
      <div
        ref={selectionRectRef}
        className="absolute bg-primary/15 pointer-events-none z-50 hidden"
      />

      {/* 已删除页面横幅 */}
      {page.deletedAt && (
        <div className="sticky top-0 z-50 bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <Trash2 className="w-4 h-4" />
            <span>此页面已移至回收站</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => restorePage?.(page.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              恢复
            </button>
            <button
              onClick={() => permanentDeletePage?.(page.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              永久删除
            </button>
          </div>
        </div>
      )}

      {/* 封面区域（独立 hover） */}
      {page.cover && (
        <div
          ref={coverRef}
          className="absolute left-0 right-0 overflow-hidden transition-[height] duration-300 select-none group/cover z-0"
          style={{ height: `${coverPx}px`, cursor: isRepositioning ? 'ns-resize' : 'default' }}
          onMouseDown={(e) => { e.stopPropagation(); handleCoverDrag(e); }}
        >
          <img
            src={page.cover}
            alt="封面"
            className="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `50% ${coverPosY}%` }}
            loading="lazy"
            draggable={false}
          />
          {/* 调整位置时的中央提示 */}
          {isRepositioning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-6 py-2 bg-black/50 backdrop-blur-sm text-white text-sm rounded-md shadow-lg">
                拖动图片以调整位置
              </div>
            </div>
          )}
          {/* 封面右上角操作按钮 */}
          <div className={`absolute top-3 right-3 flex items-center transition-opacity ${isRepositioning ? 'opacity-100' : 'opacity-0 group-hover/cover:opacity-100'}`}>
            {isRepositioning ? (
              <div className="flex items-center bg-black/50 rounded overflow-hidden">
                <button
                  onClick={savePosition}
                  className="px-2.5 py-1 text-xs text-white/90 hover:bg-white/10 transition-colors"
                >
                  保存位置
                </button>
                <div className="w-px h-3 bg-white/20" />
                <button
                  onClick={cancelReposition}
                  className="px-2.5 py-1 text-xs text-white/90 hover:bg-white/10 transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-black/40 rounded overflow-hidden">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs text-white/90 hover:bg-white/10 transition-colors"
                >
                  更换封面
                </button>
                <div className="w-px h-3 bg-white/20" />
                <button
                  onClick={enterRepositionMode}
                  className="px-2.5 py-1 text-xs text-white/90 hover:bg-white/10 transition-colors flex items-center gap-1"
                >
                  <MoveVertical className="w-3 h-3" />
                  调整位置
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="transition-[height] duration-300" style={{ height: `${textTopOffset}px` }} />

      {/* 文本区 */}
      <div className="max-w-3xl mx-auto px-[30px] group/header">
        {/* 图标区域：有封面时重叠到封面底部，无封面时在空白区 */}
        {page.icon && (
          <div className="relative z-10 pb-3" style={{ marginTop: page.cover ? -(TOP_MARGIN_PX + 39) : -39 }}>
            <button
              ref={iconTriggerRef}
              onClick={() => setShowIconPicker(true)}
              className="block transition-all duration-200 rounded-md hover:bg-accent/30 hover:backdrop-blur-sm"
            >
              <PageIcon icon={page.icon} size={78} />
            </button>
          </div>
        )}

        {/* 标题上方操作栏 */}
        <div className="flex items-center gap-3 mb-2">
          {!page.icon && (
            <button
              ref={addIconTriggerRef}
              onClick={() => setShowIconPicker(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity hover:bg-accent rounded-md transition-colors"
            >
              <Smile className="w-4 h-4" />
              添加图标
            </button>
          )}
          {!page.cover && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity hover:bg-accent rounded-md transition-colors"
            >
              <Image className="w-4 h-4" />
              添加封面
            </button>
          )}
          <button className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity hover:bg-accent rounded-md transition-colors">
            <MessageSquare className="w-4 h-4" />
            添加评论
          </button>
        </div>

        <input
          value={page.title}
          onChange={(e) => updatePage(page.id, { title: e.target.value })}
          className="text-4xl font-bold mb-[50px] w-full outline-none select-none placeholder:select-none bg-transparent text-foreground placeholder:text-muted-foreground"
          placeholder="无标题"
        />

        <Slate
          key={page.id}
          editor={editor as ReactEditor}
          initialValue={(() => {
            const base = (page.content as Descendant[] || [{ type: 'paragraph', children: [{ text: '' }] }]);
            // 过滤掉已有的 page-link 块
            const filtered = base.filter((n: any) => {
              if (!SlateElement.isElement(n)) return true;
              return n.type !== 'page-link';
            });
            // 追加当前子页面的 page-link 块
            const links = childPages.map(child => ({
              type: 'page-link',
              pageId: child.id,
              children: [{ text: '' }],
            }));
            return [...filtered, ...links];
          })()}
          onChange={handleChange}
        >
          <Editable
            renderElement={(props) => <BlockElement {...props} pages={childPages} onActivatePage={onActivatePage} />}
            renderLeaf={(props) => <Leaf {...props} />}
            className="prose dark:prose-invert max-w-none outline-none border-none focus:outline-none"
            spellCheck={false}
            onKeyDown={(event) => {
              // 如果 slash 菜单打开，让菜单独占导航键
              if (slashMenuOpen && ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
                event.preventDefault();
                return;
              }

              // 行内格式化快捷键
              if (!event.ctrlKey && !event.metaKey) return;
              const mark = (() => {
                switch (event.key.toLowerCase()) {
                  case 'b': return 'bold';
                  case 'i': return 'italic';
                  case 'u': return 'underline';
                  case 'k': return 'link';
                  default: return null;
                }
              })();
              if (!mark) return;
              event.preventDefault();
              if (mark === 'link') {
                const url = window.prompt('输入链接地址:');
                if (url) {
                  SlateEditor.addMark(editor, 'link', url);
                } else {
                  SlateEditor.removeMark(editor, 'link');
                }
              } else {
                const isActive = SlateEditor.marks(editor)?.[mark as string] === true;
                if (isActive) {
                  SlateEditor.removeMark(editor, mark);
                } else {
                  SlateEditor.addMark(editor, mark, true);
                }
              }
            }}
            onPaste={(event) => {
              const text = event.clipboardData.getData('text/plain');
              if (!text) return;

              const blocks = parseClipboardText(text);
              if (blocks.length === 0) return;

              // 只有检测到非 paragraph 标记时才拦截，纯文本让 Slate 默认处理
              const hasSpecialBlock = blocks.some((b) => b.type !== 'paragraph');
              if (!hasSpecialBlock) return;

              event.preventDefault();

              // 收集所有选中块
              const selectedEntries: [SlateElement, Path][] = [];
              for (const [node, path] of SlateEditor.nodes(editor, {
                at: [],
                match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n) && (n as BlockElementType).selected,
              })) {
                selectedEntries.push([node as SlateElement, path]);
              }

              // 光标所在的块
              const currentBlockEntry = editor.selection
                ? SlateEditor.above(editor, {
                    match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
                  })
                : null;

              SlateEditor.withoutNormalizing(editor, () => {
                let insertPath: Path;
                let shouldSelectEnd = true;

                if (selectedEntries.length > 1) {
                  // 规则3和5：多选时，忽略光标，找最下面非空白块，插入其下方
                  const sorted = [...selectedEntries].sort((a, b) => Path.compare(a[1], b[1]));
                  let lastNonEmptyIdx = sorted.length - 1;
                  while (lastNonEmptyIdx >= 0) {
                    const [node] = sorted[lastNonEmptyIdx];
                    if (node.type === 'paragraph' && Node.string(node).trim().length === 0) {
                      lastNonEmptyIdx--;
                    } else {
                      break;
                    }
                  }
                  const targetPath = sorted[Math.max(0, lastNonEmptyIdx)][1];
                  insertPath = Path.next(targetPath);
                } else if (currentBlockEntry) {
                  const [node, path] = currentBlockEntry;
                  const isEmptyParagraph = node.type === 'paragraph' && Node.string(node).trim().length === 0;

                  if (isEmptyParagraph) {
                    // 规则4：覆盖空白文本块
                    Transforms.removeNodes(editor, { at: path });
                    insertPath = path;
                  } else {
                    // 规则2：有内容的块，插入在其下方
                    insertPath = Path.next(path);
                  }
                } else if (selectedEntries.length === 1) {
                  // 单选了一个块但光标不在块内，插入在该块下方
                  const [, path] = selectedEntries[0];
                  insertPath = Path.next(path);
                } else {
                  // 规则1：光标不在任何块内且没有选中，插入到最底部
                  insertPath = [editor.children.length];
                }

                for (const block of blocks) {
                  Transforms.insertNodes(editor, block as any, { at: insertPath });
                  insertPath = Path.next(insertPath);
                }

                if (shouldSelectEnd) {
                  const lastPath = Path.previous(insertPath);
                  try {
                    const end = SlateEditor.end(editor, lastPath);
                    Transforms.select(editor, { anchor: end, focus: end });
                  } catch {}
                }
              });
            }}
          />
        </Slate>

        {/* Slash 命令菜单 */}
        {slashMenuOpen && (
          <SlashCommandMenu
            editor={editor as ReactEditor}
            query={slashMenuQuery}
            onSelect={handleSlashSelect}
            onClose={() => setSlashMenuOpen(false)}
            position={slashMenuPos}
          />
        )}

        {/* 底部留白：滚动到最后还能继续滚动约 1/3 视口高度 */}
        <div style={{ height: '33vh' }} />
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverUpload}
      />

      {/* 图标选择器 — 固定定位，层级最高 */}
      {showIconPicker && (
        <IconPicker
          isOpen={showIconPicker}
          onClose={() => setShowIconPicker(false)}
          onSelect={(icon) => {
            updatePage(page.id, { icon: icon || undefined });
            setShowIconPicker(false);
          }}
          currentIcon={page.icon}
          anchorRef={page.icon ? iconTriggerRef : addIconTriggerRef}
        />
      )}
    </div>
  );
}
