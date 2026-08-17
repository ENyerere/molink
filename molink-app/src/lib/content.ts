// Slate 内容的文本预览提取（全站统一，此前 App 与 BlockElement 各有一份）
import { Element as SlateElement, type Descendant } from 'slate';

// 按块拼接非空行（活动日志预览用），整体截断到 maxLen 字符
export function extractPreviewLines(content: Descendant[], maxLen = 800): string {
  const lines: string[] = [];
  for (const node of content) {
    if (SlateElement.isElement(node)) {
      const line = node.children.map((c) => c.text || '').join('');
      if (line.trim()) lines.push(line.trim());
    } else if (node.text?.trim()) {
      lines.push(node.text.trim());
    }
  }
  return lines.join('\n').slice(0, maxLen);
}

// 连续文本流（page-link 悬停卡用），深度优先遍历，截断到 maxLen 并补省略号
export function getContentPreview(content: Descendant[], maxLen = 120): string {
  let text = '';
  const extract = (nodes: Descendant[]) => {
    for (const node of nodes) {
      if (text.length > maxLen) break;
      if ('text' in node) {
        text += node.text;
      } else {
        extract(node.children as Descendant[]);
      }
    }
  };
  extract(content);
  return text.slice(0, maxLen) + (text.length > maxLen ? '...' : '');
}
