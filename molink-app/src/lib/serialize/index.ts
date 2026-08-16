// 序列化模块统一出口
export { slateToMarkdown, markdownToBlocks, parseInlineMarkdown, serializeInlineMarkdown } from './markdown';
export { slateToHTML, wrapHtmlDocument, htmlToBlocks, serializeInlineHTML } from './html';
export { isSafeUrl, escapeHTML, type SerializeOptions, type PageTitleResolver } from './shared';

// 触发浏览器下载（导出 Markdown / HTML 用）
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
