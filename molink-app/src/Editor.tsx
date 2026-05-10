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
      updatePage(page.id, { cover: url });
    }
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

      {/* 封面 */}
      <div className="absolute left-0 right-0 overflow-hidden transition-[height] duration-300" style={{ height: `${coverPx}px` }}>
        {page.cover ? (
          <img src={page.cover} alt="封面" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full group relative">
            <label className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg cursor-pointer hover:bg-accent">
              添加封面
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </label>
          </div>
        )}
      </div>

      <div className="transition-[height] duration-300" style={{ height: `${textTopOffset}px` }} />

      {/* 文本区 */}
      <div className="max-w-3xl mx-auto px-[30px]">
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
    </div>
  );
}
