// 前端核心类型统一定义处
// 历史原因这些类型曾寄生在 App.tsx / BlockElement.tsx 中被反向 import；
// 两处保留 re-export 兼容旧引用，新代码一律从这里 import
import type { Descendant } from 'slate';

/* ==================== 页面 / 用户 / 活动 ==================== */

export interface PageData {
  id: string;
  title: string;
  content: Descendant[];
  cover?: string;
  coverPosition?: number;
  icon?: string;
  parentId?: string;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Activity {
  id: string;
  type: 'edit' | 'delete' | 'create' | 'icon-change' | 'block-add' | 'block-delete';
  userName: string;
  userInitial: string;
  pageId: string;
  pageTitle: string;
  pageIcon?: string;
  preview?: string;
  oldIcon?: string;
  newIcon?: string;
  timestamp: string;
}

/* ==================== Slate 文档模型 ==================== */

export interface DatabaseColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  options?: string[];
}

// 单元格取值：文本/选择/日期列为 string，数字列为 number，复选框列为 boolean
export type DatabaseCellValue = string | number | boolean;

export interface DatabaseRow {
  id: string;
  [columnId: string]: DatabaseCellValue | undefined;
}

export type BlockElementType = {
  id?: string; // 多块存储模型下与后端 blocks 行一一对应（page-link 等瞬态节点除外）
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
    | 'page-link'
    | 'database';
  children: CustomText[];
  selected?: boolean; // 框选瞬态标记，落库/导出前必须剥离
  checked?: boolean;  // for todo
  pageId?: string;    // for page-link
  columns?: DatabaseColumn[]; // for database
  rows?: DatabaseRow[];       // for database
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
