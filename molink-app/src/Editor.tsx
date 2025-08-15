import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createEditor, Editor as SlateEditor, Transforms, Element as SlateElement, type Descendant } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import type { PageData } from './App';

const COVER_VH = 30;          // 有封面时封面高度（30vh）
const TOP_MARGIN_PX = 60;     // 封面下方额外间距
const NO_COVER_PX = 60;       // 无封面时顶部空白

export default function Editor({
  page,
  updatePage,
}: {
  page: PageData;
  updatePage: (id: string, newData: Partial<PageData>) => void;
}) {
  const editor = useMemo(() => withReact(createEditor()), []);

  const [coverPx, setCoverPx] = useState<number>(
    page.cover ? Math.round(window.innerHeight * (COVER_VH / 100)) : NO_COVER_PX
  );
  const [textTopOffset, setTextTopOffset] = useState<number>(
    page.cover
      ? Math.round(window.innerHeight * (COVER_VH / 100)) + TOP_MARGIN_PX
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

  const handleAddCover = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        updatePage(page.id, { cover: url });
      }
    };
    input.click();
  };

  // 限制 Ctrl+A 仅全选一个块
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      if (!editor.selection) return;

      // 找到光标所在的最近“块”节点
      const blockEntry = SlateEditor.above(editor, {
        match: n => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
      });

      if (blockEntry) {
        const [, path] = blockEntry;
        Transforms.select(editor, SlateEditor.range(editor, path));
      }
    }
  };

  return (
    <div className="relative">
      {/* 封面 */}
      <div
        className="absolute left-0 right-0 overflow-hidden transition-[height] duration-300"
        style={{ height: `${coverPx}px` }}
      >
        {page.cover ? (
          <img
            src={page.cover}
            alt="封面"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full group relative">
            <button
              onClick={handleAddCover}
              className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white px-4 py-2 rounded"
            >
              添加封面
            </button>
          </div>
        )}
      </div>

      {/* 占位 */}
      <div
        className="transition-[height] duration-300"
        style={{ height: `${textTopOffset}px` }}
      />

      {/* 文本区 */}
      <div className="max-w-3xl mx-auto px-[30px]">
        <input
          value={page.title}
          onChange={(e) => updatePage(page.id, { title: e.target.value })}
          className="text-4xl font-bold mb-[50px] w-full outline-none"
          placeholder="无标题"
        />

        <Slate
          key={page.id}
          editor={editor}
          initialValue={
            (page.content as Descendant[]) || [
              { type: 'paragraph', children: [{ text: '' }] },
            ]
          }
          onChange={handleChange}
        >
          <Editable
            placeholder="输入内容..."
            onKeyDown={handleKeyDown}
            className="prose max-w-none outline-none border-none focus:outline-none"
          />
        </Slate>
      </div>
    </div>
  );
}
