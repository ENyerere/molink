// withMarkdownShortcuts.ts
import { Editor, Transforms, Range, Point, Path, Element as SlateElement, Text, Node } from 'slate';

const blockShortcuts: Record<string, string> = {
  '#': 'heading-one',
  '##': 'heading-two',
  '###': 'heading-three',
  '####': 'heading-four',
  '[]': 'todo',
  '【】': 'todo',
  '*': 'bulleted-list',
  '-': 'bulleted-list',
  '+': 'toggle-list',
  '1.': 'numbered-list',
  '|': 'blockquote',
  '>': 'blockquote',
  '"': 'blockquote',
  '!!': 'emphasis-block',
  '```': 'code-block',
  '$$': 'math-block',
};

const inlineReplacements: Record<string, string> = {
  '--': '—',
  '->': '→',
  '-》': '→',
  '<-': '←',
  '《-': '←',
  '>=': '≥',
  '》=': '≥',
  '<=': '≤',
  '《=': '≤',
  '!=': '≠',
};

// 退出块类型的列表（按两次回车退回 paragraph）
const toggleOffBlocks = new Set([
  'heading-one',
  'heading-two',
  'heading-three',
  'heading-four',
  'blockquote',
  'code-block',
  'math-block',
  'emphasis-block',
]);

export const withMarkdownShortcuts = (editor: Editor) => {
  const { insertText, insertBreak, deleteBackward } = editor;

  /* ---- 行内替换规则 ---- */
  editor.insertText = ((originalInsertText) => (text: string) => {
    const { selection } = editor;
    if (text && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection;
      const block = Editor.above(editor, {
        match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      });
      const path = block ? block[1] : [];
      const start = Editor.start(editor, path);
      const range = { anchor, focus: start };
      const beforeText = Editor.string(editor, range) + text;

      // 行内替换
      for (const [key, value] of Object.entries(inlineReplacements)) {
        if (beforeText.endsWith(key)) {
          Transforms.delete(editor, { unit: 'character', reverse: true, distance: key.length });
          originalInsertText(value);
          return;
        }
      }
    }
    originalInsertText(text);
  })(insertText);

  /* ---- 块级规则：space 触发 ---- */
  editor.insertText = ((originalInsertText) => (text: string) => {
    const { selection } = editor;
    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const block = Editor.above(editor, {
        match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      });
      const path = block ? block[1] : [];
      const start = Editor.start(editor, path);
      const range = { anchor: selection.anchor, focus: start };
      const beforeText = Editor.string(editor, range);

      if (blockShortcuts[beforeText]) {
        Transforms.select(editor, range);
        Transforms.delete(editor);
        Transforms.setNodes(
          editor,
          { type: blockShortcuts[beforeText] } as Partial<SlateElement>,
          { match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n) }
        );
        return;
      }
    }
    originalInsertText(text);
  })(editor.insertText);

  /* ---- 回车处理 ---- */
  editor.insertBreak = () => {
    const { selection } = editor;
    if (!selection) {
      insertBreak();
      return;
    }

    const block = Editor.above(editor, {
      match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
    });
    if (!block) {
      insertBreak();
      return;
    }

    const [element, path] = block;

    // 获取当前块内光标位置
    const blockStart = Editor.start(editor, path);
    const blockEnd = Editor.end(editor, path);
    const isAtStart = Point.equals(selection.anchor, blockStart);
    const isAtEnd = Point.equals(selection.anchor, blockEnd);
    const isEmpty =
      Node.string(element).trim().length === 0;

    // 空块 + 在末尾 => 在当前块后插入新 paragraph，保持当前块类型
    if (isEmpty && toggleOffBlocks.has(element.type as string)) {
      const nextPath = Path.next(path);
      Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }] } as Partial<SlateElement>, { at: nextPath });
      Transforms.select(editor, { path: [...nextPath, 0], offset: 0 });
      return;
    }

    // 列表项回车
    if (element.type === 'bulleted-list' || element.type === 'numbered-list') {
      if (isEmpty) {
        // 空列表项 => 退出列表
        Transforms.setNodes(editor, { type: 'paragraph' } as Partial<SlateElement>, { at: path });
      } else {
        // 非空 => 插入同级新列表项
        Transforms.splitNodes(editor, { always: true });
      }
      return;
    }

    if (element.type === 'todo') {
      if (isEmpty) {
        Transforms.setNodes(
          editor,
          { type: 'paragraph', checked: undefined } as Partial<SlateElement>,
          { at: path }
        );
      } else {
        Transforms.splitNodes(editor, { always: true });
        // 新 todo 项默认未勾选
        Transforms.setNodes(editor, { checked: false } as Partial<SlateElement>);
      }
      return;
    }

    if (element.type === 'toggle-list') {
      if (isEmpty) {
        Transforms.setNodes(editor, { type: 'paragraph' } as Partial<SlateElement>, { at: path });
      } else {
        Transforms.splitNodes(editor, { always: true });
      }
      return;
    }

    // 代码块内回车：保持代码块类型
    if (element.type === 'code-block') {
      Transforms.insertText(editor, '\n');
      return;
    }

    // 默认行为
    insertBreak();
  };

  /* ---- Backspace：块首时退出块类型 ---- */
  editor.deleteBackward = ((originalDeleteBackward) => (unit) => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const block = Editor.above(editor, {
        match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      });
      if (block) {
        const [element, path] = block;
        const blockStart = Editor.start(editor, path);
        if (Point.equals(selection.anchor, blockStart)) {
          // 在块首按 backspace
          if (element.type !== 'paragraph') {
            Transforms.setNodes(
              editor,
              { type: 'paragraph', checked: undefined } as Partial<SlateElement>,
              { at: path }
            );
            return;
          }
          // 空 paragraph 在块首按 backspace：直接删除当前块，光标移到前一个块末尾
          const isEmpty = Node.string(element).trim().length === 0;
          if (isEmpty && path[0] > 0) {
            const prevPath = Path.previous(path);
            Transforms.removeNodes(editor, { at: path });
            try {
              const prevEnd = Editor.end(editor, prevPath);
              Transforms.select(editor, { anchor: prevEnd, focus: prevEnd });
            } catch {}
            return;
          }
        }
      }
    }
    originalDeleteBackward(unit);
  })(deleteBackward);

  return editor;
};
