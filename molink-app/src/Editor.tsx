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
  type RenderElementProps,
  type RenderLeafProps,
} from 'slate-react';
import { withHistory } from 'slate-history';
import type { Activity, PageData } from './App';
import { getFileUrl } from './api/client';
import { withMarkdownShortcuts } from './withMarkdownShortcuts';
import { withBlockIds } from './withBlockIds';
import BlockElement, { type BlockElementType } from './BlockElement';
import Leaf from './Leaf';

import { Smile, Image, MessageSquare, MoveVertical, RotateCcw, Trash2 } from 'lucide-react';
import IconPicker, { PageIcon } from './components/IconPicker';
import SlashCommandMenu from './components/SlashCommandMenu';
import { ImageOverlayBar, ImageOverlayButton, ImageOverlayDivider } from './components/ui';
import { slateToMarkdown, slateToHTML, markdownToBlocks, htmlToBlocks } from './lib/serialize';

// 封面固定高度 200px（§5.2）
const COVER_PX = 200;
const TOP_MARGIN_PX = 60;
const NO_COVER_PX = 120;

// Slate 0.118 的 Node 接口没有 equals 方法，按节点结构手写深度比较。
// Slate 为不可变数据：未修改的子树保持引用相等，a === b 快速路径让比较近乎 O(1)
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const aRec = a as Record<string, unknown>;
  const bRec = b as Record<string, unknown>;
  const aKeys = Object.keys(aRec);
  if (aKeys.length !== Object.keys(bRec).length) return false;
  return aKeys.every(
    (k) => Object.prototype.hasOwnProperty.call(bRec, k) && deepEqual(aRec[k], bRec[k])
  );
}

export default function Editor({
  page,
  childPages,
  updatePage,
  uploadCover,
  onActivatePage,
  restorePage,
  permanentDeletePage,
  wideMode,
}: {
  page: PageData;
  childPages: PageData[];
  updatePage: (id: string, newData: Partial<PageData>, activityType?: Activity['type'] | null, activityPreview?: string) => void;
  uploadCover: (pageId: string, file: File) => Promise<string | null>;
  onActivatePage?: (id: string) => void;
  restorePage?: (id: string) => void;
  permanentDeletePage?: (id: string) => void;
  wideMode?: boolean;
}) {
  // 编辑器实例按页面重建：Slate 组件虽按 page.id 重挂，但同一 editor 对象会带上
  // 上一页的 undo 历史，切页后 Ctrl+Z 会把旧页面操作回放到新页面内容上
  const editor = useMemo(
    () => withMarkdownShortcuts(withHistory(withBlockIds(withReact(createEditor())))),
    // 故意依赖 page.id：page.id 变化时重建 editor 实例（工厂本身不读 page.id）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page.id]
  );
  const isSyncingRef = useRef(false);

  // 持有最新的 childPages / onActivatePage，供身份稳定的回调读取
  const childPagesRef = useRef(childPages);
  useEffect(() => { childPagesRef.current = childPages; }, [childPages]);
  const onActivatePageRef = useRef(onActivatePage);
  useEffect(() => { onActivatePageRef.current = onActivatePage; }, [onActivatePage]);

  // page-link 标题解析：与 BlockElement 保持一致，从当前子页面列表查
  const resolvePageTitle = useCallback(
    (id: string) => childPagesRef.current.find((p) => p.id === id)?.title,
    []
  );

  // 当前框选（块级 selected）的块，按文档顺序返回
  const getBoxSelectedBlocks = useCallback((): BlockElementType[] => {
    const selected: BlockElementType[] = [];
    for (const [node] of SlateEditor.nodes(editor, {
      at: [],
      match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n) && (n as BlockElementType).selected === true,
    })) {
      selected.push(node as BlockElementType);
    }
    return selected;
  }, [editor]);

  // 剪贴板双格式写入：text/plain 走 Markdown，text/html 供粘贴到 Word/飞书等保留格式
  const writeClipboard = useCallback(
    (data: DataTransfer, blocks: Descendant[]) => {
      data.setData('text/plain', slateToMarkdown(blocks, { resolvePageTitle }));
      data.setData('text/html', slateToHTML(blocks, { resolvePageTitle }));
    },
    [resolvePageTitle]
  );

  const [coverPx, setCoverPx] = useState<number>(
    page.cover ? COVER_PX : NO_COVER_PX
  );
  const [textTopOffset, setTextTopOffset] = useState<number>(
    page.cover
      ? COVER_PX + TOP_MARGIN_PX + 60
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
      } catch { /* 节点对应的 DOM 可能已卸载或路径已失效，忽略 */ }
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
      const [block, path] = blockEntry;

      // 只删除块开头的 "/查询词" 文本，保留块内其余内容
      //（原实现整块删除，块内斜杠命令之外的内容会一起丢失）
      const text = Node.string(block);
      const slashMatch = text.match(/^\/[^\s]*/);
      if (slashMatch) {
        const start = SlateEditor.start(editor, path);
        Transforms.delete(editor, {
          at: { anchor: start, focus: { path: start.path, offset: slashMatch[0].length } },
        });
      }

      const newProps: Partial<BlockElementType> = { type: type as BlockElementType['type'] };
      if (type === 'todo') newProps.checked = false;
      if (type === 'database') {
        newProps.columns = [
          { id: 'col_1', name: '名称', type: 'text' },
          { id: 'col_2', name: '状态', type: 'select', options: ['待办', '进行中', '已完成'] },
        ];
        newProps.rows = [];
      }
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
    const px = page.cover ? COVER_PX : NO_COVER_PX;
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
      // 内容未变化则跳过（防止 updatePage 后 Slate 二次触发 onChange）；
      // 深度比较不受键顺序影响，避免每次击键对全篇做两次 JSON 序列化
      if (deepEqual(page.content, value)) return;

      // Slash 命令菜单检测（在 onChange 中检测比 onKeyDown 更可靠）
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        const blockEntry = SlateEditor.above(editor, {
          match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
        });
        if (blockEntry) {
          const [block] = blockEntry;
          if (SlateElement.isElement(block) && block.type === 'paragraph') {
            const text = block.children.map((c) => c.text).join('');
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
      const oldTexts = page.content.map((node) =>
        SlateElement.isElement(node) ? node.children.map((c) => c.text || '').join('') : (node.text || '')
      );
      const newTexts = value.map((node) =>
        SlateElement.isElement(node) ? node.children.map((c) => c.text || '').join('') : (node.text || '')
      );
      // 集合查询替代数组 includes，避免 O(n²)
      const oldTextSet = new Set(oldTexts);
      const newTextSet = new Set(newTexts);
      const added = newTexts.filter((t: string) => !oldTextSet.has(t));
      const removed = oldTexts.filter((t: string) => !newTextSet.has(t));

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
    if (!editor) return;

    const existing = Array.from(SlateEditor.nodes(editor, {
      at: [],
      match: (n) => SlateElement.isElement(n) && n.type === 'page-link',
    }));

    // 通过 ref 读取最新 childPages，effect 只随 id 集合变化触发，避免每次渲染全树扫描
    const currentChildPages = childPagesRef.current;
    const neededIds = currentChildPages.map(c => c.id);
    const existingIds = existing.map(([n]) => (n as SlateElement).pageId);

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

      // 在文档末尾插入新的 page-link；显式指定位置且不移动光标，避免编辑器聚焦时抢焦点
      for (const child of currentChildPages) {
        Transforms.insertNodes(editor, {
          type: 'page-link',
          pageId: child.id,
          children: [{ text: '' }],
        } as BlockElementType, { at: [editor.children.length], select: false });
      }
    });

    // 延迟重置标志，跳过这次触发的 onChange
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [editor, childPageIdsKey]);

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
        } catch { /* 节点对应的 DOM 可能已卸载或路径已失效，忽略 */ }
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
      } catch { /* 节点对应的 DOM 可能已卸载或路径已失效，忽略 */ }
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

  // renderElement / renderLeaf 必须保持身份稳定，否则 slate-react 的元素级 memo 失效，
  // 每次击键都会全量重渲染所有块；变化的数据（childPages / onActivatePage）通过 ref 读取
  const renderElement = useCallback(
    (props: RenderElementProps) => (
      <BlockElement {...props} pages={childPagesRef.current} onActivatePage={onActivatePageRef.current} />
    ),
    []
  );
  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <Leaf {...props} />,
    []
  );

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
        className="absolute bg-selection/15 pointer-events-none z-dropdown hidden"
      />

      {/* 已删除页面横幅 */}
      {page.deletedAt && (
        <div className="sticky top-0 z-dropdown bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between">
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
            src={getFileUrl(page.cover)}
            alt="封面"
            className="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `50% ${coverPosY}%` }}
            loading="lazy"
            draggable={false}
          />
          {/* 底部渐变遮罩：灰阶透明度过渡，衔接正文背景（禁彩色光效） */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/70 to-transparent" />
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
              <ImageOverlayBar>
                <ImageOverlayButton onClick={savePosition}>
                  保存位置
                </ImageOverlayButton>
                <ImageOverlayDivider />
                <ImageOverlayButton onClick={cancelReposition}>
                  取消
                </ImageOverlayButton>
              </ImageOverlayBar>
            ) : (
              <ImageOverlayBar className="bg-black/40">
                <ImageOverlayButton onClick={() => fileInputRef.current?.click()}>
                  更换封面
                </ImageOverlayButton>
                <ImageOverlayDivider />
                <ImageOverlayButton onClick={enterRepositionMode} className="flex items-center gap-1">
                  <MoveVertical className="w-3 h-3" />
                  调整位置
                </ImageOverlayButton>
              </ImageOverlayBar>
            )}
          </div>
        </div>
      )}

      <div className="transition-[height] duration-300" style={{ height: `${textTopOffset}px` }} />

      {/* 文本区：内容列默认 720px 居中，宽版 960px（§3.3） */}
      <div className={`${wideMode ? 'max-w-[960px]' : 'max-w-[720px]'} mx-auto px-[30px] group/header`}>
        {/* 图标区域：有封面时重叠到封面底部，无封面时在空白区 */}
        {page.icon && (
          <div className="relative z-10 pb-3" style={{ marginTop: page.cover ? -(TOP_MARGIN_PX + 32) : -32 }}>
            <button
              ref={iconTriggerRef}
              onClick={() => setShowIconPicker(true)}
              className="block transition-all duration-200 rounded-md hover:bg-accent/30 hover:backdrop-blur-sm"
            >
              <PageIcon icon={page.icon} size={64} />
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
          className="text-4xl font-bold mb-[50px] w-full outline-none placeholder:select-none bg-transparent text-foreground placeholder:text-muted-foreground"
          placeholder="无标题"
        />

        <Slate
          key={page.id}
          editor={editor as ReactEditor}
          initialValue={(() => {
            const base = (page.content as Descendant[] || [{ type: 'paragraph', children: [{ text: '' }] }]);
            // 过滤掉已有的 page-link 块
            const filtered = base.filter((n) => {
              if (!SlateElement.isElement(n)) return true;
              return n.type !== 'page-link';
            });
            // 追加当前子页面的 page-link 块
            const links: BlockElementType[] = childPages.map(child => ({
              type: 'page-link',
              pageId: child.id,
              children: [{ text: '' }],
            }));
            return [...filtered, ...links];
          })()}
          onChange={handleChange}
        >
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            className="prose dark:prose-invert max-w-none outline-none border-none focus:outline-none"
            spellCheck={false}
            onCompositionStart={() => { (editor as SlateEditor & { isComposing?: boolean }).isComposing = true; }}
            onCompositionEnd={() => { (editor as SlateEditor & { isComposing?: boolean }).isComposing = false; }}
            onCopy={(event) => {
              const selected = getBoxSelectedBlocks();
              if (selected.length > 0) {
                // 框选块整体序列化（Markdown + HTML 双格式，行内标记不再丢失）
                event.preventDefault();
                writeClipboard(event.clipboardData, selected);
                return;
              }
              // 光标选区同样提供带格式复制；空选区不拦截
              const { selection } = editor;
              if (selection && !Range.isCollapsed(selection)) {
                event.preventDefault();
                const fragment = Node.fragment(editor, selection);
                writeClipboard(event.clipboardData, fragment as Descendant[]);
              }
            }}
            onCut={(event) => {
              const selected = getBoxSelectedBlocks();
              // 无框选块时交给 Slate 默认剪切（只处理光标选区）
              if (selected.length === 0) return;
              event.preventDefault();
              writeClipboard(event.clipboardData, selected);
              // 框选的块由这里负责删除
              const entries = Array.from(SlateEditor.nodes(editor, {
                at: [],
                match: (n) => SlateElement.isElement(n) && (n as BlockElementType).selected === true,
              }));
              SlateEditor.withoutNormalizing(editor, () => {
                for (let i = entries.length - 1; i >= 0; i--) {
                  Transforms.removeNodes(editor, { at: entries[i][1] });
                }
              });
            }}
            onKeyDown={(event) => {
              // 中文输入法组词期间不拦截按键（候选词选择、上屏）
              if (event.nativeEvent.isComposing) return;

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
                const isActive = SlateEditor.marks(editor)?.[mark] === true;
                if (isActive) {
                  SlateEditor.removeMark(editor, mark);
                } else {
                  SlateEditor.addMark(editor, mark, true);
                }
              }
            }}
            onPaste={(event) => {
              const text = event.clipboardData.getData('text/plain');

              // 光标在代码块内：原样插入（保留换行），不走任何解析
              const pasteBlock = editor.selection
                ? SlateEditor.above(editor, {
                    match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
                  })
                : null;
              if (pasteBlock && (pasteBlock[0] as BlockElementType).type === 'code-block') {
                if (!text) return;
                event.preventDefault();
                editor.insertText(text.replace(/\r\n?/g, '\n'));
                return;
              }

              // 优先解析 HTML（网页 / Word / 本应用复制都带格式），没有 HTML 再走 Markdown 启发式
              const html = event.clipboardData.getData('text/html');
              let blocks: BlockElementType[] = [];
              if (html) {
                try {
                  blocks = htmlToBlocks(html);
                } catch (err) {
                  console.error('解析粘贴的 HTML 失败:', err);
                }
              }
              if (blocks.length === 0 && text) {
                blocks = markdownToBlocks(text);
              }
              if (blocks.length === 0) return;

              // 纯段落且无任何行内标记时不拦截，让 Slate 默认处理纯文本粘贴
              const hasRichContent = blocks.some(
                (b) =>
                  b.type !== 'paragraph' ||
                  b.children.some((c) => c.bold || c.italic || c.code || c.underline || c.strikethrough || c.link)
              );
              if (!hasRichContent) return;

              event.preventDefault();

              // 收集所有选中块
              const selectedEntries: [SlateElement, Path][] = [];
              for (const [node, path] of SlateEditor.nodes(editor, {
                at: [],
                match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n) && (n as BlockElementType).selected === true,
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
                const shouldSelectEnd = true;

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
                  const isEmptyParagraph = SlateElement.isElement(node) && node.type === 'paragraph' && Node.string(node).trim().length === 0;

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
                  Transforms.insertNodes(editor, block, { at: insertPath });
                  insertPath = Path.next(insertPath);
                }

                if (shouldSelectEnd) {
                  const lastPath = Path.previous(insertPath);
                  try {
                    const end = SlateEditor.end(editor, lastPath);
                    Transforms.select(editor, { anchor: end, focus: end });
                  } catch { /* 节点对应的 DOM 可能已卸载或路径已失效，忽略 */ }
                }
              });
            }}
          />
        </Slate>

        {/* Slash 命令菜单 */}
        {slashMenuOpen && (
          <SlashCommandMenu
            query={slashMenuQuery}
            onSelect={handleSlashSelect}
            onClose={() => setSlashMenuOpen(false)}
            onQueryChange={setSlashMenuQuery}
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
