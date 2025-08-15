import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createEditor } from 'slate';
import type { Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import type { PageData } from './App';

const COVER_VH = 30;          // 有封面时封面高度（30vh）。想要20%就改成 20
const TOP_MARGIN_PX = 60;     // 你要求的额外 60px 间距
const NO_COVER_PX = 60;       // 无封面时顶部空白 60px

export default function Editor({
  page,
  updatePage,
}: {
  page: PageData;
  updatePage: (id: string, newData: Partial<PageData>) => void;
}) {
  const editor = useMemo(() => withReact(createEditor()), []);

  const [coverPx, setCoverPx] = useState<number>(page.cover ? Math.round(window.innerHeight * (COVER_VH / 100)) : NO_COVER_PX);
  const [textTopOffset, setTextTopOffset] = useState<number>(page.cover ? Math.round(window.innerHeight * (COVER_VH / 100)) + TOP_MARGIN_PX : NO_COVER_PX);

  const recomputeOffsets = useCallback(() => {
    const px = page.cover ? Math.round(window.innerHeight * (COVER_VH / 100)) : NO_COVER_PX;
    setCoverPx(px);
    setTextTopOffset(px + (page.cover ? TOP_MARGIN_PX : 0)); // 有封面=封面底部+60，无封面=60
  }, [page.cover]);

  useEffect(() => {
    recomputeOffsets();               // 封面有/无变化时重新计算
  }, [recomputeOffsets]);

  useEffect(() => {
    const onResize = () => recomputeOffsets(); // 浏览器窗口变化时也实时更新
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
        // updatePage 触发 page.cover 变化，recomputeOffsets 会随之执行
      }
    };
    input.click();
  };

  return (
    <div className="relative">
      {/* 封面区域（使用像素高度，和占位同步动画） */}
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

      {/* 占位符（文本区顶部距离 = 封面实际像素高度 + 60px，如果有封面；否则 60px） */}
      <div
        className="transition-[height] duration-300"
        style={{ height: `${textTopOffset}px` }}
      />

      {/* 文本内容区域 */}
      <div className="max-w-3xl mx-auto px-[30px]">
        <input
          value={page.title}
          onChange={(e) => updatePage(page.id, { title: e.target.value })}
          className="text-4xl font-bold mb-4 w-full border-b outline-none"
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
            className="prose max-w-none outline-none border-none focus:outline-none"
          />
        </Slate>
      </div>
    </div>
  );
}
