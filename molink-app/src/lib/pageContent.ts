// Slate 文档 ↔ 后端多块模型转换
// 模型（第三期决策乙）：Slate 顶层节点与 blocks 表行 1:1 对应；
// content.slate 存权威节点 JSON（含 id），block_type 只是粗粒度分类标签
import { Element, type Descendant } from 'slate';
import { v4 as uuidv4 } from 'uuid';
import type { BackendBlock, BlockType } from '../api';

// Slate 顶层节点类型 → 后端 block_type 粗粒度映射（权威类型以 content.slate.type 为准；
// todo/toggle-list/math-block 等后端枚举没有的折叠到最近语义类）
export function slateTypeToBlockType(type: string): BlockType {
  switch (type) {
    case 'heading-one': return 'h1';
    case 'heading-two': return 'h2';
    case 'heading-three': return 'h3';
    case 'heading-four': return 'h4';
    case 'bulleted-list':
    case 'todo':
    case 'toggle-list': return 'ul';
    case 'numbered-list': return 'ol';
    case 'blockquote':
    case 'emphasis-block': return 'quote';
    case 'code-block': return 'code';
    case 'database': return 'table';
    default: return 'text';
  }
}

export function emptyParagraph(): Descendant {
  return { type: 'paragraph', children: [{ text: '' }] } as Descendant;
}

// 剥离瞬态字段（块级框选 selected）；落库与快照哈希共用，保证两端口径一致
export function cleanSlateNode<T extends Descendant>(node: T): T {
  if (!Element.isElement(node) || !('selected' in node)) return node;
  const rest = { ...node };
  delete (rest as { selected?: boolean }).selected;
  return rest as T;
}

// 旧版整篇存储判定：单个 text 块且 content.slate 是数组（第一期之前的存储格式）
export function isLegacySingleBlockDoc(blocks: BackendBlock[]): boolean {
  return (
    blocks.length === 1 &&
    blocks[0].block_type === 'text' &&
    Array.isArray(blocks[0].content?.slate)
  );
}

// 后端块行 → Slate 顶层节点（节点 id 即后端 block id）
function blockToSlateNode(block: BackendBlock): Descendant | null {
  const raw = block.content?.slate;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>), id: block.id } as unknown as Descendant;
  }
  // 脏行（content 缺失/损坏）：按 block_type 还原为空壳节点，不丢位置
  return {
    id: block.id,
    type: 'paragraph',
    children: [{ text: '' }],
  } as unknown as Descendant;
}

// blocks 列表 → Slate 文档（list 接口已按 position 升序返回）
export function blocksToSlate(blocks: BackendBlock[]): Descendant[] {
  if (isLegacySingleBlockDoc(blocks)) {
    // 旧格式：展开整篇数组，顶层节点补客户端 id；首次内容保存时整体迁移为多块
    const slate = blocks[0].content.slate as Descendant[];
    const nodes = slate.map(n =>
      Element.isElement(n) && !('id' in n) ? ({ ...n, id: uuidv4() } as Descendant) : n
    );
    return nodes.length > 0 ? nodes : [emptyParagraph()];
  }
  const nodes = blocks
    .map(blockToSlateNode)
    .filter((n): n is Descendant => n !== null);
  return nodes.length > 0 ? nodes : [emptyParagraph()];
}
