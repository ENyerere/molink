import React, { useState, useCallback, useMemo } from 'react';
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
  Node,
} from 'slate';

/* ==================== TYPES ==================== */
export type BlockElementType = {
  type:
    | 'paragraph'
    | 'heading-one'
    | 'heading-two'
    | 'heading-three'
    | 'heading-four'
    | 'bulleted-list'
    | 'numbered-list'
    | 'todo'
    | 'toggle-list'
    | 'blockquote'
    | 'code-block'
    | 'math-block'
    | 'emphasis-block';
  children: { text: string }[];
  selected?: boolean;
  checked?: boolean; // for todo
};

export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  link?: string;
};

/* ==================== DRAG HANDLE ICON ==================== */
const DragHandleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="opacity-50">
    <circle cx="2.5" cy="2.5" r="1.2" />
    <circle cx="6" cy="2.5" r="1.2" />
    <circle cx="9.5" cy="2.5" r="1.2" />
    <circle cx="2.5" cy="6" r="1.2" />
    <circle cx="6" cy="6" r="1.2" />
    <circle cx="9.5" cy="6" r="1.2" />
    <circle cx="2.5" cy="9.5" r="1.2" />
    <circle cx="6" cy="9.5" r="1.2" />
    <circle cx="9.5" cy="9.5" r="1.2" />
  </svg>
);

/* ==================== COMPONENT ==================== */
const BlockElement = (props: RenderElementProps) => {
  const { attributes, children, element } = props;
  const editor = useSlateStatic();
  const selected = (element as BlockElementType).selected;

  const [indicator, setIndicator] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const path = ReactEditor.findPath(editor as ReactEditor, element);

  /* ---- 点击选中当前块，取消其他块 ---- */
  const handleClick = useCallback(() => {
    requestAnimationFrame(() => {
      SlateEditor.withoutNormalizing(editor, () => {
        for (const [, p] of SlateEditor.nodes(editor, {
          at: [],
          match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
        })) {
          Transforms.setNodes<BlockElementType>(editor, { selected: false }, { at: p });
        }
        Transforms.setNodes<BlockElementType>(editor, { selected: true }, { at: path });
      });
    });
  }, [editor, path]);

  /* ---- 块级样式 ---- */
  const blockClass = useMemo(() => {
    const base = 'relative py-[3px] px-1 rounded transition-colors my-[2px]';
    switch (element.type) {
      case 'heading-one':
        return `${base} text-[2rem] font-bold text-foreground tracking-tight mt-6 mb-2 leading-tight`;
      case 'heading-two':
        return `${base} text-[1.5rem] font-semibold text-foreground tracking-tight mt-5 mb-2 leading-snug`;
      case 'heading-three':
        return `${base} text-[1.25rem] font-semibold text-foreground mt-4 mb-1 leading-snug`;
      case 'heading-four':
        return `${base} text-[1.1rem] font-medium text-foreground mt-3 mb-1 leading-snug`;
      case 'blockquote':
        return `${base} border-l-[3px] border-primary/30 pl-3 italic text-muted-foreground my-2`;
      case 'code-block':
        return `${base} bg-muted font-mono text-[0.875rem] p-3 rounded-md my-2 whitespace-pre-wrap leading-relaxed`;
      case 'math-block':
        return `${base} bg-muted font-mono text-center p-3 rounded-md my-2 text-sm`;
      case 'emphasis-block':
        return `${base} bg-primary/5 border border-primary/10 p-3 rounded-md my-2 text-sm`;
      case 'bulleted-list':
      case 'numbered-list':
      case 'todo':
      case 'toggle-list':
        return `${base} flex items-start gap-1`;
      default:
        return `${base} text-base text-foreground leading-relaxed`;
    }
  }, [element.type]);

  /* ---- 列表序号计算 ---- */
  const listNumber = useMemo(() => {
    if (element.type !== 'numbered-list') return null;
    try {
      const parentPath = path.length > 1 ? Path.parent(path) : [];
      const index = path[path.length - 1];
      const siblings =
        parentPath.length === 0
          ? editor.children
          : Node.get(editor, parentPath).children;
      let count = 1;
      for (let i = 0; i < index; i++) {
        const sibling = siblings[i];
        if (SlateElement.isElement(sibling) && sibling.type === 'numbered-list') {
          count++;
        } else {
          count = 1;
        }
      }
      return count;
    } catch {
      return 1;
    }
  }, [element.type, path, editor]);

  /* ---- 列表前缀 ---- */
  const prefix = useMemo(() => {
    if (element.type === 'bulleted-list') {
      return (
        <span
          contentEditable={false}
          className="inline-flex items-center justify-center w-6 h-6 flex-shrink-0 select-none text-foreground/80 mt-[2px]"
        >
          •
        </span>
      );
    }
    if (element.type === 'numbered-list' && listNumber !== null) {
      return (
        <span
          contentEditable={false}
          className="inline-flex items-center justify-center w-6 h-6 flex-shrink-0 select-none text-foreground/80 text-sm mt-[2px] tabular-nums"
        >
          {listNumber}.
        </span>
      );
    }
    if (element.type === 'todo') {
      const checked = (element as BlockElementType).checked;
      return (
        <span
          contentEditable={false}
          className="inline-flex items-center justify-center w-5 h-5 flex-shrink-0 select-none mt-[2px] cursor-pointer text-foreground/60 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            Transforms.setNodes(editor, { checked: !checked } as Partial<SlateElement>, { at: path });
          }}
        >
          {checked ? '☑' : '☐'}
        </span>
      );
    }
    if (element.type === 'toggle-list') {
      return (
        <span
          contentEditable={false}
          className="inline-flex items-center justify-center w-5 h-5 flex-shrink-0 select-none mt-[2px] cursor-pointer text-muted-foreground hover:text-foreground"
        >
          ▶
        </span>
      );
    }
    return null;
  }, [element.type, listNumber, (element as BlockElementType).checked, editor, path]);

  /* ---- 拖拽排序 ---- */
  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const fromPath = path;

      // 收集所有选中的块路径
      const selectedPaths: Path[] = [];
      for (const [node, p] of SlateEditor.nodes(editor, {
        at: [],
        match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n) && (n as BlockElementType).selected,
      })) {
        selectedPaths.push(p);
      }
      const isMultiSelect = selectedPaths.length > 1 && selectedPaths.some((p) => Path.equals(p, fromPath));

      const onMouseMove = (ev: MouseEvent) => {
        if (isMultiSelect) {
          setIndicator(null); // 多选时不显示插入指示线
          return;
        }

        // 单选：遍历所有 Slate 块节点，找 Y 坐标最接近的
        let bestTarget: {
          node: SlateElement;
          path: Path;
          rect: DOMRect;
          before: boolean;
        } | null = null;
        let minDist = Infinity;

        for (const [node, p] of SlateEditor.nodes(editor, {
          at: [],
          match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
        })) {
          try {
            const dom = ReactEditor.toDOMNode(editor as ReactEditor, node as SlateElement);
            const rect = dom.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const dist = Math.abs(ev.clientY - midY);

            if (dist < minDist) {
              minDist = dist;
              bestTarget = {
                node: node as SlateElement,
                path: p,
                rect,
                before: ev.clientY < midY,
              };
            }
          } catch {}
        }

        if (bestTarget) {
          setIndicator({
            top: bestTarget.before ? bestTarget.rect.top : bestTarget.rect.bottom,
            left: bestTarget.rect.left,
            width: bestTarget.rect.width,
          });
        }
      };

      const onMouseUp = (ev: MouseEvent) => {
        setIndicator(null);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (isMultiSelect) {
          // === 多选批量移动 ===
          selectedPaths.sort(Path.compare);
          // 深拷贝节点内容
          const nodesToMove = selectedPaths.map((p) => {
            const node = Node.get(editor, p);
            return JSON.parse(JSON.stringify(node));
          });

          // 确定目标位置（基于删除前的 DOM）
          let targetIndex = -1;
          let minDist = Infinity;
          for (const [node, p] of SlateEditor.nodes(editor, {
            at: [],
            match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
          })) {
            try {
              const dom = ReactEditor.toDOMNode(editor as ReactEditor, node as SlateElement);
              const rect = dom.getBoundingClientRect();
              const midY = rect.top + rect.height / 2;
              const dist = Math.abs(ev.clientY - midY);
              if (dist < minDist) {
                minDist = dist;
                targetIndex = ev.clientY < midY ? p[0] : p[0] + 1;
              }
            } catch {}
          }
          if (targetIndex === -1) return;

          // 调整目标 index（删除的节点在目标之前时，目标要前移）
          let adjustedIndex = targetIndex;
          for (const p of selectedPaths) {
            if (p[0] < targetIndex) {
              adjustedIndex--;
            }
          }
          adjustedIndex = Math.max(0, adjustedIndex);

          // 从后往前删除，然后批量插入
          SlateEditor.withoutNormalizing(editor, () => {
            for (let i = selectedPaths.length - 1; i >= 0; i--) {
              Transforms.removeNodes(editor, { at: selectedPaths[i] });
            }
            Transforms.insertNodes(editor, nodesToMove, { at: [adjustedIndex] });
          });
          return;
        }

        // === 单选移动 ===
        let bestTarget: {
          node: SlateElement;
          path: Path;
          before: boolean;
        } | null = null;
        let minDist = Infinity;

        for (const [node, p] of SlateEditor.nodes(editor, {
          at: [],
          match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n),
        })) {
          try {
            const dom = ReactEditor.toDOMNode(editor as ReactEditor, node as SlateElement);
            const rect = dom.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const dist = Math.abs(ev.clientY - midY);

            if (dist < minDist) {
              minDist = dist;
              bestTarget = {
                node: node as SlateElement,
                path: p,
                before: ev.clientY < midY,
              };
            }
          } catch {}
        }

        if (bestTarget && !Path.equals(fromPath, bestTarget.path)) {
          const toPath = bestTarget.before
            ? bestTarget.path
            : Path.next(bestTarget.path);
          if (!Path.equals(fromPath, toPath)) {
            Transforms.moveNodes(editor, { at: fromPath, to: toPath });
          }
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [editor, path]
  );

  return (
    <div
      {...attributes}
      className={`${blockClass} group ${selected ? 'bg-primary/15' : ''}`}
      onClick={handleClick}
    >
      {/* 拖拽手柄 — select-none + SVG 防止被复制 */}
      <span
        contentEditable={false}
        className="absolute -left-7 top-[3px] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab select-none text-muted-foreground hover:text-foreground p-1"
        onMouseDown={handleDragMouseDown}
        title="拖动移动此块"
      >
        <DragHandleIcon />
      </span>

      {/* 列表前缀 */}
      {prefix}

      {/* 内容 */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* 拖拽指示线 */}
      {indicator && (
        <div
          contentEditable={false}
          className="fixed z-50 h-[2px] bg-primary"
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
