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
import { Smile, Image, MessageSquare, MoveVertical } from 'lucide-react';

const COVER_VH = 30;
const TOP_MARGIN_PX = 60;
const NO_COVER_PX = 120;

export default function Editor({
  page,
  updatePage,
  uploadCover,
}: {
  page: PageData;
  updatePage: (id: string, newData: Partial<PageData>) => void;
  uploadCover: (pageId: string, file: File) => Promise<string | null>;
}) {
  const editor = useMemo(() => withMarkdownShortcuts(withReact(createEditor())), []);

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
    setTextTopOffset(px + (page.cover ? TOP_MARGIN_PX : 0));
  }, [page.cover]);

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
      updatePage(page.id, { content: value });
    },
    [page.id, updatePage]
  );

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
  const [selectionRect, setSelectionRect] = useState<{ left: number; top: number; width: number; height: number; } | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!dragSelecting) return;

    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (!startPos.current || !containerRef.current) return;
      const cx = e.clientX, cy = e.clientY, sx = startPos.current.x, sy = startPos.current.y;
      const cr = containerRef.current.getBoundingClientRect();
      const left = Math.min(cx, sx) - cr.left;
      const top = Math.min(cy, sy) - cr.top;
      const width = Math.abs(cx - sx);
      const height = Math.abs(cy - sy);
      setSelectionRect({ left, top, width, height });

      const rectViewport = { left: Math.min(cx, sx), right: Math.max(cx, sx), top: Math.min(cy, sy), bottom: Math.max(cy, sy) };

      for (const [node, path] of SlateEditor.nodes(editor, {
        at: [],
        match: n => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
      })) {
        try {
          const dom = ReactEditor.toDOMNode(editor as ReactEditor, node as SlateElement);
          const brect = dom.getBoundingClientRect();
          const overlap =
            rectViewport.left < brect.right &&
            rectViewport.right > brect.left &&
            rectViewport.top < brect.bottom &&
            rectViewport.bottom > brect.top;
          Transforms.setNodes<BlockElementType>(editor, { selected: overlap }, { at: path });
        } catch {}
      }
    };

    const onMouseUp = () => {
      setDragSelecting(false);
      setSelectionRect(null);
      startPos.current = null;
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
    };
  }, [dragSelecting, editor]);

  // 隐藏的文件输入
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        if (e.target instanceof HTMLElement && e.target.closest('[data-slate-node="element"]')) return;
        startPos.current = { x: e.clientX, y: e.clientY };
        setDragSelecting(true);
      }}
    >
      {selectionRect && (
        <div
          className="absolute border border-primary/50 bg-primary/20 pointer-events-none z-50"
          style={selectionRect}
        />
      )}

      {/* 封面区域（独立 hover） */}
      {page.cover && (
        <div
          ref={coverRef}
          className="absolute left-0 right-0 overflow-hidden transition-[height] duration-300 select-none group/cover"
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
        {/* 标题上方操作栏 */}
        <div className="flex items-center gap-3 mb-2 -mt-2">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity hover:text-foreground">
            <Smile className="w-4 h-4" />
            添加图标
          </button>
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
          initialValue={page.content as Descendant[] || [{ type: 'paragraph', children: [{ text: '' }] }]}
          onChange={handleChange}
        >
          <Editable
            renderElement={(props) => <BlockElement {...props} />}
            placeholder="输入内容..."
            className="prose dark:prose-invert max-w-none outline-none border-none focus:outline-none"
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
    </div>
  );
}
