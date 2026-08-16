// 序列化公共工具：顶层节点规整、HTML 转义、URL 安全校验
import { Element as SlateElement, type Descendant } from 'slate';
import type { BlockElementType } from '../../BlockElement';

// page-link 序列化时把 pageId 翻译成可读标题的回调（由持有 pages 列表的一方注入）
export type PageTitleResolver = (pageId: string) => string | undefined;

export interface SerializeOptions {
  resolvePageTitle?: PageTitleResolver;
}

// 规整序列化输入：
// - 剥离瞬态 selected 标记（框选状态不该出现在任何导出结果里）
// - 顶层混排的裸文本节点（Node.fragment 截取选区时可能出现）包装为 paragraph
export function normalizeTopLevel(content: Descendant[]): BlockElementType[] {
  const blocks: BlockElementType[] = [];
  for (const node of content) {
    if (SlateElement.isElement(node)) {
      const copy = { ...(node as BlockElementType) };
      delete copy.selected;
      blocks.push(copy);
    } else if (node.text) {
      blocks.push({ type: 'paragraph', children: [{ text: node.text }] });
    }
  }
  return blocks;
}

// HTML 文本转义：所有导出的文本节点都必须过这层，防注入
export function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// URL 协议白名单：拦截 javascript: / data: / vbscript: 等可执行协议
//（先剥掉所有空白字符，防止 "java script:" 之类的混淆绕过）
export function isSafeUrl(url: string): boolean {
  const compact = url.trim().toLowerCase().replace(/\s+/g, '');
  return !/^(javascript|data|vbscript):/.test(compact);
}
