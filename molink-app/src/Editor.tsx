import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  createEditor,
  Editor as SlateEditor,
  Transforms,
  Element as SlateElement,
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
import { Smile, Image, MessageSquare, MoveVertical } from 'lucide-react';
import IconPicker, { PageIcon } from './components/IconPicker';

const COVER_VH = 30;
const TOP_MARGIN_PX = 60;
const NO_COVER_PX = 120;

export default function Editor({
  page,
  childPages,
  updatePage,
  uploadCover,
  onActivatePage,
}: {
  page: PageData;
  childPages: PageData[];
  updatePage: (id: string, newData: Partial<PageData>) => void;
  uploadCover: (pageId: string, file: File) => Promise<string | null>;
  onActivatePage?: (id: string) => void;
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
      updatePage(page.id, { content: value });
    },
    [page.id, updatePage]
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
        startPos.current = { x: e.clientX, y: e.clientY };
        setDragSelecting(true);
      }}
    >
      <div
        ref={selectionRectRef}
        className="absolute bg-primary/15 pointer-events-none z-50 hidden"
      />

      {/* 封面区域（独立 hover） */}
      {page.cover && (
        <div
          ref={coverRef}
          className="absolute left-0 right-0 overflow-hidden transition-[height] duration-300 select-none group/cover z-0"
          style={{ height: `${coverPx}px`, cursor: isRepositioning ? 'ns-resize' : 'default' }}
          onMouseDown={handleCoverDrag}
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
          <div className="relative z-10" style={{ marginTop: page.cover ? -(TOP_MARGIN_PX + 39) : -39 }}>
            <button
              ref={iconTriggerRef}
              onClick={() => setShowIconPicker(true)}
              className="block transition-opacity hover:opacity-80"
            >
              <PageIcon icon={page.icon} size={78} />
            </button>
          </div>
        )}

        {/* 标题上方操作栏 */}
        <div className="flex items-center gap-3 mb-2 relative z-10">
          {!page.icon && (
            <button
              ref={addIconTriggerRef}
              onClick={() => setShowIconPicker(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity hover:text-foreground"
            >
              <Smile className="w-4 h-4" />
              添加图标
            </button>
          )}
          {!page.cover && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity hover:text-foreground"
            >
              <Image className="w-4 h-4" />
              添加封面
            </button>
          )}
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity hover:text-foreground">
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
            placeholder="输入内容，或输入 / 打开命令菜单..."
            className="prose dark:prose-invert max-w-none outline-none border-none focus:outline-none"
            onKeyDown={(event) => {
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
          />
        </Slate>
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
