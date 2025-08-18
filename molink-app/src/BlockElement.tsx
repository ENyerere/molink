import React from 'react';
import {
  type RenderElementProps,
  useSlateStatic,
  ReactEditor,
} from 'slate-react';
import {
  Editor as SlateEditor,
  Element as SlateElement,
  Transforms,
  Path,
} from 'slate';

export type BlockElementType = {
  type: 'paragraph' | 'heading' | 'block';
  children: any[];
  selected?: boolean;
};

const BlockElement = (props: RenderElementProps) => {
  const { attributes, children, element } = props;
  const editor = useSlateStatic();

  const selected = (element as any).selected;

  // 点击块：仅高亮当前块
  const handleClick = (e: React.MouseEvent) => {
    // 不打断光标定位
    requestAnimationFrame(() => {
      // 清空所有块的 selected
      SlateEditor.withoutNormalizing(editor, () => {
        for (const [, path] of SlateEditor.nodes(editor, {
          at: [],
          match: n => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
        })) {
          Transforms.setNodes<BlockElementType>(
            editor,
            { selected: false },
            { at: path }
          );
        }
        // 当前块选中
        const path = ReactEditor.findPath(editor as ReactEditor, element);
        Transforms.setNodes<BlockElementType>(editor, { selected: true }, { at: path });
      });
    });
  };

  // 拖动调整块顺序
  const handleDragMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const fromPath = ReactEditor.findPath(editor as ReactEditor, element);

    const onMouseMove = (_ev: MouseEvent) => {
      // 可在这里做指示线（目前为简化版本省略）
    };

    const onMouseUp = (ev: MouseEvent) => {
      try {
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        const blockEl = target?.closest('[data-slate-node="element"]') as HTMLElement | null;
        if (blockEl) {
          // DOM -> Slate Node
          const slateNode = ReactEditor.toSlateNode(editor as ReactEditor, blockEl);
          if (SlateElement.isElement(slateNode) && SlateEditor.isBlock(editor, slateNode)) {
            const toPath = ReactEditor.findPath(editor as ReactEditor, slateNode);
            const rect = blockEl.getBoundingClientRect();
            const before = ev.clientY < rect.top + rect.height / 2;

            const finalPath = before ? toPath : Path.next(toPath);
            if (!Path.equals(fromPath, finalPath)) {
              Transforms.moveNodes(editor, { at: fromPath, to: finalPath });
            }
          }
        }
      } catch {
        // 忽略错误
      } finally {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      {...attributes}
      className={`relative group p-1 rounded ${selected ? 'bg-blue-100' : ''}`}
      onClick={handleClick}
    >
      {/* 拖动按钮（不依赖第三方图标） */}
      <button
        contentEditable={false}
        className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab select-none text-gray-500"
        onMouseDown={handleDragMouseDown}
        title="拖动移动此块"
        aria-label="drag block"
      >
        ⋮⋮
      </button>

      {children}
    </div>
  );
};

export default BlockElement;
