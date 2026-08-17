// Slate 文档内容 ↔ 后端 Block 存储格式的双向转换
// 当前模型：整篇 Slate JSON 存进单个 block_type='text' 的块（见 docs/frontend-cleanup-plan.md 第三期决策）
import { Element, type Descendant } from 'slate';
import type { BackendBlock } from '../api';

export function blocksToSlate(blocks: BackendBlock[]): Descendant[] {
  const textBlock = blocks.find(b => b.block_type === 'text');
  if (textBlock?.content?.slate) {
    return textBlock.content.slate as Descendant[];
  }
  return [{ type: 'paragraph', children: [{ text: '' }] } as Element];
}

export function slateToBlockContent(content: Descendant[]): Record<string, unknown> {
  // 落库前剥离瞬态状态：块级选中的 selected 标记与渲染用 page-link 块，
  // 否则刷新后内容里会带蓝色选中高亮 / 与 page-link 同步逻辑重复的链接块
  const slate = content
    .filter(node => !(Element.isElement(node) && node.type === 'page-link'))
    .map(node => {
      if (!Element.isElement(node) || !('selected' in node)) return node;
      const rest: typeof node = { ...node };
      delete (rest as { selected?: boolean }).selected;
      return rest as Descendant;
    });
  return { slate };
}
