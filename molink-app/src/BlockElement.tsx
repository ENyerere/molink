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
import type { PageData } from './App';
import { PageIcon } from './components/IconPicker';
import { FileText } from 'lucide-react';

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
    | 'emphasis-block'
    | 'page-link';
  children: { text: string }[];
  selected?: boolean;
  checked?: boolean; // for todo
  pageId?: string;   // for page-link
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
const BlockElement = (props: RenderElementProps & { pages?: PageData[]; onActivatePage?: (id: string) => void }) => {
  const { attributes, children, element, pages, onActivatePage } = props;
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
      case 'page-link':
        return 'relative py-0 px-1 rounded transition-colors my-[2px] cursor-pointer';
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
      const startMousePos = { x: e.clientX, y: e.clientY };

      // 收集所有选中的块路径
      const selectedPaths: Path[] = [];
      for (const [node, p] of SlateEditor.nodes(editor, {
        at: [],
        match: (n) => SlateElement.isElement(n) && SlateEditor.isBlock(editor, n) && (n as BlockElementType).selected,
      })) {
        selectedPaths.push(p);
      }
      const selectedCount = selectedPaths.length;
      const isMultiSelect = selectedCount > 1 && selectedPaths.some((p) => Path.equals(p, fromPath));

      // 选中块组的范围（多选时）
      const selectedRange = isMultiSelect
        ? { min: Math.min(...selectedPaths.map(p => p[0])), max: Math.max(...selectedPaths.map(p => p[0])) }
        : null;

      let ghost: HTMLElement | null = null;
      let hasStartedDrag = false;
      let ghostOffset = { x: 0, y: 0 };

      const onMouseMove = (ev: MouseEvent) => {
        const dx = Math.abs(ev.clientX - startMousePos.x);
        const dy = Math.abs(ev.clientY - startMousePos.y);

        // 启动拖拽阈值
        if (!hasStartedDrag && dx < 4 && dy < 4) return;
        hasStartedDrag = true;

        // 创建拖拽虚影（第一次超过阈值时）
        if (!ghost) {
          ghost = document.createElement('div');
          ghost.style.position = 'fixed';
          ghost.style.pointerEvents = 'none';
          ghost.style.zIndex = '9999';
          ghost.style.opacity = '0.55';
          ghost.style.filter = 'contrast(0.5) brightness(1.4)';

          const cleanupClone = (el: HTMLElement) => {
            // 移除选中蓝色背景
            el.removeAttribute('data-block-selected');
            // 移除拖拽手柄
            el.querySelectorAll('span[contenteditable="false"]').forEach(child => {
              const htmlChild = child as HTMLElement;
              if (htmlChild.classList.contains('absolute') || htmlChild.classList.contains('cursor-grab')) {
                child.remove();
              }
            });
            // 移除固定指示线
            el.querySelectorAll('div[contenteditable="false"]').forEach(child => {
              const htmlChild = child as HTMLElement;
              if (htmlChild.classList.contains('fixed')) {
                child.remove();
              }
            });
            // 仅重置定位相关属性，保持其他所有样式（宽度、行高、padding、margin 等）
            el.style.position = 'static';
          };

          let sourceRect: DOMRect | null = null;

          if (isMultiSelect) {
            // 多选：克隆所有选中的块
            selectedPaths.sort(Path.compare);
            for (const p of selectedPaths) {
              try {
                const node = Node.get(editor, p);
                const dom = ReactEditor.toDOMNode(editor as ReactEditor, node as SlateElement);
                const clone = dom.cloneNode(true) as HTMLElement;
                cleanupClone(clone);
                ghost.appendChild(clone);
                if (Path.equals(p, fromPath)) {
                  sourceRect = dom.getBoundingClientRect();
                }
              } catch {}
            }
          } else {
            // 单选：克隆当前块
            try {
              const dom = ReactEditor.toDOMNode(editor as ReactEditor, element as SlateElement);
              const clone = dom.cloneNode(true) as HTMLElement;
              cleanupClone(clone);
              ghost.appendChild(clone);
              sourceRect = dom.getBoundingClientRect();
            } catch {
              ghost.textContent = '块';
            }
          }

          document.body.appendChild(ghost);
          document.body.style.cursor = 'grabbing';

          // 让虚影宽度和原始块完全一致，确保文本换行和原块一样
          if (sourceRect) {
            ghost.style.width = `${sourceRect.width}px`;

            // 计算被拖拽块在 ghost 内部的 Y 偏移（前面有多少个块的高度）
            let draggedBlockOffsetY = 0;
            if (isMultiSelect) {
              for (const p of selectedPaths) {
                if (Path.equals(p, fromPath)) break;
                try {
                  const node = Node.get(editor, p);
                  const dom = ReactEditor.toDOMNode(editor as ReactEditor, node as SlateElement);
                  draggedBlockOffsetY += dom.getBoundingClientRect().height;
                } catch {}
              }
            }

            // ghost 位置使得被拖拽块的第一行对准鼠标附近
            ghostOffset.x = sourceRect.left - startMousePos.x;
            ghostOffset.y = sourceRect.top - startMousePos.y - draggedBlockOffsetY;
          }
        }

        // 更新虚影位置：跟随鼠标，保持初始相对偏移
        if (ghost) {
          ghost.style.left = `${ev.clientX + ghostOffset.x}px`;
          ghost.style.top = `${ev.clientY + ghostOffset.y}px`;
        }

        // 计算插入指示线
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
          const targetIndex = bestTarget.path[0];
          // 多选时：如果目标在选中块组内部，不显示指示线
          const isInsideSelection = selectedRange !== null &&
            targetIndex >= selectedRange.min &&
            targetIndex <= selectedRange.max;

          if (isInsideSelection) {
            setIndicator(null);
          } else {
            setIndicator({
              top: bestTarget.before ? bestTarget.rect.top : bestTarget.rect.bottom,
              left: bestTarget.rect.left,
              width: bestTarget.rect.width,
            });
          }
        }
      };

      const onMouseUp = (ev: MouseEvent) => {
        // 移除虚影
        if (ghost) {
          ghost.remove();
          ghost = null;
        }
        document.body.style.cursor = '';
        setIndicator(null);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (!hasStartedDrag) return;

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

          // 多选时：如果目标在选中块组内部，不移动
          if (selectedRange !== null && adjustedIndex >= selectedRange.min && adjustedIndex <= selectedRange.max + 1) {
            return;
          }

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
    [editor, path, element]
  );

  /* ---- 从 Slate 内容提取文本预览 ---- */
function getContentPreview(content: any[]): string {
  let text = '';
  const extract = (nodes: any[]) => {
    for (const node of nodes) {
      if (text.length > 120) break;
      if (node.text) {
        text += node.text;
      } else if (node.children) {
        extract(node.children);
      }
    }
  };
  extract(content);
  return text.slice(0, 120) + (text.length > 120 ? '...' : '');
}

/* ---- page-link 块特殊渲染 ---- */
function PageLinkPreview({ page }: { page: PageData }) {
  const previewText = getContentPreview(page.content);
  return (
    <div className="absolute top-full left-0 mt-1 w-64 bg-card rounded-lg shadow-xl border border-border p-3 z-50 pointer-events-none">
      {page.cover && (
        <div
          className="w-full h-24 rounded-md mb-2 bg-cover bg-center"
          style={{ backgroundImage: `url(${page.cover})` }}
        />
      )}
      <div className="flex items-center gap-2">
        {page.icon ? <PageIcon icon={page.icon} size={16} /> : <FileText className="w-4 h-4 text-muted-foreground" />}
        <span className="font-medium text-sm text-card-foreground truncate">
          {page.title || '无标题'}
        </span>
      </div>
      {previewText && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {previewText}
        </p>
      )}
    </div>
  );
}

  if (element.type === 'page-link') {
    const pageId = (element as BlockElementType).pageId;
    const targetPage = pages?.find(p => p.id === pageId);
    const [showPreview, setShowPreview] = useState(false);

    return (
      <div
        {...attributes}
        className={`${blockClass} group`}
        data-block-selected={selected ? 'true' : undefined}
        contentEditable={false}
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
          onActivatePage?.(pageId!);
        }}
      >
        {/* 拖拽手柄 */}
        <span
          contentEditable={false}
          className="absolute -left-7 top-[3px] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab select-none text-muted-foreground hover:text-foreground p-1"
          onMouseDown={handleDragMouseDown}
          title="拖动移动此块"
        >
          <DragHandleIcon />
        </span>

        <div className="flex items-center gap-2 py-0.5">
          {targetPage?.icon ? (
            <PageIcon icon={targetPage.icon} size={18} />
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm text-foreground hover:underline">
            {targetPage?.title || '未命名页面'}
          </span>
        </div>

        {/* 预览框 */}
        {showPreview && targetPage && (
          <PageLinkPreview page={targetPage} />
        )}

        {/* Slate 占位节点 — 不占据布局空间 */}
        <span className="absolute w-0 h-0 overflow-hidden">
          {children}
        </span>

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
  }

  return (
    <div
      {...attributes}
      className={`${blockClass} group`}
      data-block-selected={selected ? 'true' : undefined}
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
