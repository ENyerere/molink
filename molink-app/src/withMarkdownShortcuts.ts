// withMarkdownShortcuts.ts
import { Editor, Transforms, Range, Point, Element as SlateElement, Text } from 'slate';

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

export const withMarkdownShortcuts = (editor: Editor) => {
  const { insertText, insertBreak } = editor;

  // 行内替换规则
  editor.insertText = (text) => {
    const { selection } = editor;
    if (text && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection;
      const block = Editor.above(editor, {
        match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      });
      const path = block ? block[1] : [];
      const start = Editor.start(editor, path);
      const range = { anchor, focus: start };
      const beforeText = Editor.string(editor, range) + text;

      // 行内替换
      for (const [key, value] of Object.entries(inlineReplacements)) {
        if (beforeText.endsWith(key)) {
          Transforms.delete(editor, { unit: 'character', reverse: true, distance: key.length });
          insertText(value);
          return;
        }
      }
    }
    insertText(text);
  };

  // 块级规则：space 触发
  editor.insertText = ((originalInsertText) => (text: string) => {
    const { selection } = editor;
    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const block = Editor.above(editor, {
        match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
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
          { match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n) }
        );
        return;
      }
    }
    originalInsertText(text);
  })(editor.insertText);

  // 处理回车（比如数字列表自动递增）
  editor.insertBreak = () => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const block = Editor.above(editor, {
        match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      });
      if (block) {
        const [element] = block;
        if (
          SlateElement.isElement(element) && 'type' in element && element.type === 'numbered-list') {
          insertText('\n2. '); // 简单递增，后续可扩展
          return;
        }
      }
    }
    insertBreak();
  };

  return editor;
};
