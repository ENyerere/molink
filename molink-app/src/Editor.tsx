import React, { useCallback } from 'react';
import { createEditor } from 'slate';
import type { Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import type { PageData } from './App';

interface EditorProps {
  page: PageData;
  updatePage: (id: string, newData: Partial<PageData>) => void;
}

export default function Editor({ page, updatePage }: EditorProps) {
  const editor = React.useMemo(() => withReact(createEditor()), []);

  const handleChange = useCallback(
    (value: Descendant[]) => {
      updatePage(page.id, { content: value });
    },
    [page.id, updatePage]
  );

  return (
    <div>
      <input
        value={page.title}
        onChange={e => updatePage(page.id, { title: e.target.value })}
        className="text-2xl font-bold mb-4 w-full border-b outline-none"
        placeholder="无标题"
      />
      <Slate
        editor={editor}
        initialValue={page.content as Descendant[] || [
          { type: 'paragraph', children: [{ text: '' }] }
        ]}
        onChange={handleChange}
      >

        <Editable
          placeholder="输入内容..."
          className="prose max-w-none"
        />
      </Slate>

    </div>
  );
}
