// 顶层块 id 保障插件（多块存储模型的地基）
// 每个顶层节点都需要稳定唯一的 id 与后端 blocks 行对应。
// 回车（split_node）与粘贴会复制节点属性导致 id 重复，这里在 normalize 阶段补齐：
// 缺失或重复的 id 重新分配（重复时保留先出现的，后者拿新 id——回车产生的新块永远是后者）
import { Editor, Element, Transforms } from 'slate';
import { v4 as uuidv4 } from 'uuid';

export function withBlockIds<T extends Editor>(editor: T): T {
  const { normalizeNode } = editor;

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // 只在文档根扫一遍顶层子节点；叶层节点不需要 id
    if (path.length === 0 && Element.isElement(node)) {
      const seen = new Set<string>();
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (!Element.isElement(child)) continue;
        const id = (child as { id?: string }).id;
        if (!id || seen.has(id)) {
          // 一次只修一个：setNodes 触发新一轮 normalize 时再处理下一个，避免索引失效
          Transforms.setNodes(editor, { id: uuidv4() }, { at: [i] });
          return;
        }
        seen.add(id);
      }
    }

    normalizeNode(entry);
  };

  return editor;
}
