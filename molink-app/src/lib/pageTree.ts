// 页面树索引统一构建（此前 App 的 pagesById/childrenByParent 与 Sidebar 的 buildTree
// 是两套并行实现）。一次遍历产出三种视图，按 pages 数组顺序保序
import type { PageData } from '../types';

export interface PageTreeNode {
  page: PageData;
  children: PageTreeNode[];
}

export interface PageIndexes {
  /** id 直查 */
  byId: Map<string, PageData>;
  /** 父 id → 子页面数组（含已删除的，供 page-link 渲染与后代收集） */
  childrenByParent: Map<string, PageData[]>;
  /** 根节点起的树（parentId 悬空或指向不存在页面的按根处理） */
  tree: PageTreeNode[];
}

export function buildPageIndexes(pages: PageData[]): PageIndexes {
  const byId = new Map<string, PageData>();
  const childrenByParent = new Map<string, PageData[]>();
  const nodeById = new Map<string, PageTreeNode>();

  for (const p of pages) {
    byId.set(p.id, p);
    nodeById.set(p.id, { page: p, children: [] });
  }

  const tree: PageTreeNode[] = [];
  for (const p of pages) {
    if (p.parentId && byId.has(p.parentId)) {
      const siblings = childrenByParent.get(p.parentId);
      if (siblings) siblings.push(p);
      else childrenByParent.set(p.parentId, [p]);
      nodeById.get(p.parentId)!.children.push(nodeById.get(p.id)!);
    } else {
      tree.push(nodeById.get(p.id)!);
    }
  }

  return { byId, childrenByParent, tree };
}
