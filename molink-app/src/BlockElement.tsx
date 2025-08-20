import React, { useState } from 'react';
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

  const [indicator, setIndicator] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // 点击高亮
  const handleClick = () => {
    requestAnimationFrame(() => {
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
        const path = ReactEditor.findPath(editor as ReactEditor, element);
        Transforms.setNodes<BlockElementType>(editor, { selected: true }, { at: path });
      });
    });
  };

  // 拖动调整顺序 + 显示指示线
  const handleDragMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const fromPath = ReactEditor.findPath(editor as ReactEditor, element);

    const onMouseMove = (ev: MouseEvent) => {
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const blockEl = target?.closest('[data-slate-node="element"]') as HTMLElement | null;
      if (blockEl) {
        const rect = blockEl.getBoundingClientRect();
        const before = ev.clientY < rect.top + rect.height / 2;

        setIndicator({
          top: before ? rect.top : rect.bottom,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      try {
        if (indicator) {
          const target = document.elementFromPoint(ev.clientX, ev.clientY);
          const blockEl = target?.closest('[data-slate-node="element"]') as HTMLElement | null;
          if (blockEl) {
            const slateNode = ReactEditor.toSlateNode(editor as ReactEditor, blockEl);
            if (SlateElement.isElement(slateNode) && SlateEditor.isBlock(editor, slateNode)) {
              const toPath = ReactEditor.findPath(editor as ReactEditor, slateNode);
              const before = ev.clientY < blockEl.getBoundingClientRect().top + blockEl.offsetHeight / 2;
              const finalPath = before ? toPath : Path.next(toPath);

              if (!Path.equals(fromPath, finalPath)) {
                Transforms.moveNodes(editor, { at: fromPath, to: finalPath });
              }
            }
          }
        }
      } catch {} finally {
        setIndicator(null);
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
      className={`relative group flex items-center p-2 rounded transition-all ${
        selected ? 'bg-blue-100 my-2 shadow-sm' : 'my-1'
      }`}
      onClick={handleClick}
    >
      {/* 拖动按钮 */}
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

      {/* 指示线 */}
      {indicator && (
        <div
          contentEditable={false}
          className="fixed z-50 h-[2px] bg-blue-500"
          style={{
            top: `${indicator.top}px`,
            left: `${indicator.left}px`,
            width: `${indicator.width}px`,
          }}
        />
      )}
    </div>
  );
};

export default BlockElement;
