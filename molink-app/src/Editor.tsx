import React, { useCallback } from 'react';
import { createEditor } from 'slate';
import type { Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import type { PageData } from './App';

export default function Editor({ page, updatePage }: { page: PageData; updatePage: (id: string, newData: Partial<PageData>) => void }) {
  const editor = React.useMemo(() => {
    const e = withReact(createEditor());
    return e;
  }, []);

  const handleChange = useCallback(
    (value: Descendant[]) => {
      updatePage(page.id, { content: value });
    },
    [page.id, updatePage]
  );

  const handleAddCover = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        updatePage(page.id, { cover: url });
      }
    };
    input.click();
  };

  return (
    <div className="relative">
      {/* 封面区域 */}
      <div
        className={`absolute left-0 right-0 transition-all duration-300 overflow-hidden ${
          page.cover ? "h-[20vh]" : "h-[60px]"
        }`}
      >
        {page.cover ? (
          <img
            src={page.cover}
            alt="封面"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full group">
            <button
              onClick={handleAddCover}
              className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white px-4 py-2 rounded"
            >
              添加封面
            </button>
          </div>
        )}
      </div>
      {/* 占位符，用于保持内容不被覆盖 */}
      <div className={page.cover ? "h-[20vh]" : "h-[60px]"}></div>

      {/* 文本内容区域 */}
      <div className="max-w-3xl mx-auto px-[30px]">
        {/* 标题输入 */}
        <input
          value={page.title}
          onChange={e => updatePage(page.id, { title: e.target.value })}
          className="text-2xl font-bold mb-4 w-full border-b outline-none"
          placeholder="无标题"
        />

        {/* 编辑器 */}
        <Slate
          key={page.id}
          editor={editor}
          initialValue={page.content as Descendant[] || [
            { type: 'paragraph', children: [{ text: '' }] }
          ]}
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
