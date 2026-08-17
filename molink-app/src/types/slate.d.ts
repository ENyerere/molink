// Slate 编辑器自定义类型声明（declaration merging）：
// 将项目的块元素与文本标记类型注入 slate 的全局类型，
// 使 Editor / Element / Text 在编辑器相关代码中自动携带业务类型，
// 避免在使用 slate API 时处处手动断言
import { type BaseEditor } from 'slate';
import { type ReactEditor } from 'slate-react';
import { type HistoryEditor } from 'slate-history';
import { type BlockElementType, type CustomText } from '../types';

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: BlockElementType;
    Text: CustomText;
  }
}
