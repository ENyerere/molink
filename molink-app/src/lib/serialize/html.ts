// Slate 内容 ↔ HTML 双向转换
// 导出：语义标签 + 全量文本转义 + URL 协议白名单；导入：DOMParser 轻量解析（浏览器环境）
import type { Descendant } from 'slate';
import type { BlockElementType, CustomText, DatabaseRow } from '../../BlockElement';
import { escapeHTML, isSafeUrl, normalizeTopLevel, type SerializeOptions } from './shared';

/* ==================== Slate → HTML ==================== */

// 行内标记合成。code 内部不再叠加其他标记；link 过 URL 白名单，危险协议降级为纯文本
export function serializeInlineHTML(children: CustomText[]): string {
  return children
    .map((t) => {
      if (!t.text) return '';
      const text = escapeHTML(t.text);
      if (t.code) return `<code>${text}</code>`;
      let s = text;
      if (t.bold) s = `<strong>${s}</strong>`;
      if (t.italic) s = `<em>${s}</em>`;
      if (t.strikethrough) s = `<s>${s}</s>`;
      if (t.underline) s = `<u>${s}</u>`;
      if (t.link && isSafeUrl(t.link)) {
        s = `<a href="${escapeHTML(t.link)}" target="_blank" rel="noopener noreferrer">${s}</a>`;
      }
      return s;
    })
    .join('');
}

function databaseToHTML(block: BlockElementType): string {
  const columns = block.columns ?? [];
  if (columns.length === 0) return '';
  const rows = block.rows ?? [];
  const head = columns.map((c) => `<th>${escapeHTML(c.name)}</th>`).join('');
  const body = rows
    .map(
      (r) =>
        '<tr>' + columns.map((c) => `<td>${escapeHTML(String(r[c.id] ?? ''))}</td>`).join('') + '</tr>'
    )
    .join('\n');
  return `<table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
}

export function slateToHTML(content: Descendant[], options: SerializeOptions = {}): string {
  const blocks = normalizeTopLevel(content);
  const out: string[] = [];

  // 连续的列表项合并进同一个 <ul>/<ol> 容器；todo 混入 <ul> 并带禁用态 checkbox
  let listTag: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (listTag) {
      out.push(`</${listTag}>`);
      listTag = null;
    }
  };

  for (const block of blocks) {
    const inline = serializeInlineHTML(block.children);

    if (block.type === 'bulleted-list' || block.type === 'toggle-list') {
      if (listTag !== 'ul') {
        closeList();
        out.push('<ul>');
        listTag = 'ul';
      }
      out.push(`<li>${inline}</li>`);
      continue;
    }
    if (block.type === 'numbered-list') {
      if (listTag !== 'ol') {
        closeList();
        out.push('<ol>');
        listTag = 'ol';
      }
      out.push(`<li>${inline}</li>`);
      continue;
    }
    if (block.type === 'todo') {
      if (listTag !== 'ul') {
        closeList();
        out.push('<ul class="todo-list">');
        listTag = 'ul';
      }
      out.push(
        `<li class="todo"><input type="checkbox" disabled${block.checked ? ' checked' : ''}> ${inline}</li>`
      );
      continue;
    }
    closeList();

    switch (block.type) {
      case 'heading-one':
        out.push(`<h1>${inline}</h1>`);
        break;
      case 'heading-two':
        out.push(`<h2>${inline}</h2>`);
        break;
      case 'heading-three':
        out.push(`<h3>${inline}</h3>`);
        break;
      case 'heading-four':
        out.push(`<h4>${inline}</h4>`);
        break;
      case 'blockquote':
        out.push(`<blockquote>${inline}</blockquote>`);
        break;
      case 'emphasis-block':
        out.push(`<blockquote class="emphasis"><strong>${inline}</strong></blockquote>`);
        break;
      case 'code-block':
        out.push(`<pre><code>${escapeHTML(block.children.map((c) => c.text).join(''))}</code></pre>`);
        break;
      case 'math-block':
        out.push(`<div class="math">$$${escapeHTML(block.children.map((c) => c.text).join(''))}$$</div>`);
        break;
      case 'page-link': {
        const title = options.resolvePageTitle?.(block.pageId ?? '') || '页面';
        out.push(
          `<p class="page-link"><a href="molink://page/${escapeHTML(block.pageId ?? '')}">${escapeHTML(title)}</a></p>`
        );
        break;
      }
      case 'database': {
        const table = databaseToHTML(block);
        if (table) out.push(table);
        break;
      }
      default:
        // 空段落输出 <p><br>，保留视觉上的空行
        out.push(inline ? `<p>${inline}</p>` : '<p><br></p>');
    }
  }

  closeList();
  return out.join('\n');
}

// 「导出 HTML」下载用的完整文档包装：monochrome 内联样式，脱离应用也可直接阅读
export function wrapHtmlDocument(title: string, bodyHTML: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(title)}</title>
<style>
  body { max-width: 720px; margin: 40px auto; padding: 0 30px; color: #171717; background: #fff;
         font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.7; }
  h1 { font-size: 2rem; letter-spacing: -0.02em; } h2 { font-size: 1.5rem; } h3 { font-size: 1.25rem; } h4 { font-size: 1.1rem; }
  blockquote { border-left: 3px solid #d4d4d4; margin: 8px 0; padding-left: 12px; color: #525252; }
  pre { background: #171717; color: #fafafa; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.875rem; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  p code, li code { background: #f5f5f5; padding: 2px 5px; border-radius: 4px; font-size: 0.875em; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  th, td { border: 1px solid #e5e5e5; padding: 6px 10px; text-align: left; font-size: 0.875rem; }
  th { background: #fafafa; }
  a { color: #2563eb; }
  .todo { list-style: none; } .todo input { margin-right: 4px; }
  .math { background: #f5f5f5; text-align: center; padding: 12px; border-radius: 6px; font-family: ui-monospace, monospace; }
  .page-link a { color: inherit; }
</style>
</head>
<body>
<h1>${escapeHTML(title)}</h1>
${bodyHTML}
</body>
</html>
`;
}

/* ==================== HTML → Slate ==================== */

const BLOCK_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'TABLE', 'HR', 'DIV', 'SECTION', 'ARTICLE', 'FIGURE',
]);

// 行内遍历：按标签累积 marks，文本节点产出 CustomText
function inlineFromNode(node: Node, base: Partial<CustomText>): CustomText[] {
  if (node.nodeType === 3) {
    return [{ ...(base as CustomText), text: node.textContent ?? '' }];
  }
  if (node.nodeType !== 1) return [];

  const el = node as Element;
  // 块级元素混进行内遍历时不该发生；遇到则取其纯文本
  if (BLOCK_TAGS.has(el.tagName)) {
    return [{ ...(base as CustomText), text: el.textContent ?? '' }];
  }

  const marks: Partial<CustomText> = { ...base };
  switch (el.tagName) {
    case 'STRONG':
    case 'B':
      marks.bold = true;
      break;
    case 'EM':
    case 'I':
      marks.italic = true;
      break;
    case 'S':
    case 'DEL':
    case 'STRIKE':
      marks.strikethrough = true;
      break;
    case 'U':
      marks.underline = true;
      break;
    case 'CODE':
    case 'KBD':
    case 'SAMP':
      marks.code = true;
      break;
    case 'A': {
      const href = el.getAttribute('href');
      if (href && isSafeUrl(href)) marks.link = href;
      break;
    }
    case 'BR':
      return [{ ...(base as CustomText), text: '\n' }];
  }

  return Array.from(el.childNodes).flatMap((n) => inlineFromNode(n, marks));
}

// 合并相邻且 marks 完全相同的文本节点，减少碎片
function mergeTexts(texts: CustomText[]): CustomText[] {
  const merged: CustomText[] = [];
  for (const t of texts) {
    if (!t.text) continue;
    const last = merged[merged.length - 1];
    if (
      last &&
      last.bold === t.bold &&
      last.italic === t.italic &&
      last.code === t.code &&
      last.underline === t.underline &&
      last.strikethrough === t.strikethrough &&
      last.link === t.link
    ) {
      last.text += t.text;
    } else {
      merged.push({ ...t });
    }
  }
  return merged.length > 0 ? merged : [{ text: '' }];
}

function inlineChildren(el: Element): CustomText[] {
  return mergeTexts(Array.from(el.childNodes).flatMap((n) => inlineFromNode(n, {})));
}

const MOLINK_PAGE_RE = /^molink:\/\/page\/(.+)$/;

// <li> → 列表块；含 checkbox input 的识别为 todo；嵌套列表按扁平模型拍平
function listItemToBlock(li: Element, ordered: boolean): BlockElementType {
  const checkbox = li.querySelector(':scope > input[type="checkbox"]');
  const children = inlineChildren(li);
  if (checkbox) {
    return { type: 'todo', checked: checkbox.hasAttribute('checked'), children };
  }
  return { type: ordered ? 'numbered-list' : 'bulleted-list', children };
}

function tableToBlock(table: Element): BlockElementType | null {
  const headerCells = Array.from(table.querySelectorAll('thead th'));
  const firstRowCells = headerCells.length > 0 ? headerCells : Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td'));
  if (firstRowCells.length === 0) return null;

  const columns = firstRowCells.map((cell, i) => ({
    id: `col_${i + 1}`,
    name: (cell.textContent ?? '').trim() || `列 ${i + 1}`,
    type: 'text' as const,
  }));

  const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
  // 无 thead 时首行已用作表头，从第二行开始取数据
  const dataRows = headerCells.length > 0 ? bodyRows : bodyRows.slice(1);
  const rows: DatabaseRow[] = dataRows.map((tr, i) => {
    const row: DatabaseRow = { id: `row_${i + 1}` };
    Array.from(tr.children).forEach((td, j) => {
      if (j < columns.length) row[columns[j].id] = (td.textContent ?? '').trim();
    });
    return row;
  });

  return { type: 'database', columns, rows, children: [{ text: '' }] };
}

// 单个块级元素 → 块；DIV 等容器若只含块级子元素则递归拍平（返回数组）
function elementToBlocks(el: Element): BlockElementType[] {
  switch (el.tagName) {
    case 'H1':
      return [{ type: 'heading-one', children: inlineChildren(el) }];
    case 'H2':
      return [{ type: 'heading-two', children: inlineChildren(el) }];
    case 'H3':
      return [{ type: 'heading-three', children: inlineChildren(el) }];
    case 'H4':
      return [{ type: 'heading-four', children: inlineChildren(el) }];
    case 'BLOCKQUOTE': {
      // 强调块的导出形态：<blockquote class="emphasis"><strong>…</strong></blockquote>
      if (el.classList.contains('emphasis')) {
        return [{ type: 'emphasis-block', children: inlineChildren(el) }];
      }
      return [{ type: 'blockquote', children: inlineChildren(el) }];
    }
    case 'PRE':
      return [{ type: 'code-block', children: [{ text: (el.textContent ?? '').replace(/\n$/, '') }] }];
    case 'UL':
    case 'OL': {
      const ordered = el.tagName === 'OL';
      return Array.from(el.children)
        .filter((c) => c.tagName === 'LI')
        .map((li) => listItemToBlock(li, ordered));
    }
    case 'TABLE': {
      const db = tableToBlock(el);
      return db ? [db] : [];
    }
    case 'HR':
      return [];
    case 'DIV':
    case 'SECTION':
    case 'ARTICLE':
    case 'FIGURE': {
      // math-block 的导出形态：<div class="math">$$…$$</div>
      if (el.classList.contains('math')) {
        const text = (el.textContent ?? '').replace(/^\$\$|\$\$/g, '');
        return [{ type: 'math-block', children: [{ text }] }];
      }
      const blockChildren = Array.from(el.children).filter((c) => BLOCK_TAGS.has(c.tagName));
      if (blockChildren.length > 0 && blockChildren.length === el.children.length) {
        return blockChildren.flatMap(elementToBlocks);
      }
      return [{ type: 'paragraph', children: inlineChildren(el) }];
    }
    default: {
      // P 及未知标签统一按段落处理；整段只有一个 molink page 锚点时还原为 page-link 块
      const onlyAnchor =
        el.childNodes.length === 1 && el.firstChild?.nodeType === 1
          ? (el.firstChild as Element)
          : null;
      if (onlyAnchor?.tagName === 'A') {
        const m = MOLINK_PAGE_RE.exec(onlyAnchor.getAttribute('href') ?? '');
        if (m) {
          return [{ type: 'page-link', pageId: m[1], children: [{ text: '' }] }];
        }
      }
      return [{ type: 'paragraph', children: inlineChildren(el) }];
    }
  }
}

export function htmlToBlocks(html: string): BlockElementType[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks: BlockElementType[] = [];

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === 3) {
      const text = node.textContent ?? '';
      if (text.trim()) blocks.push({ type: 'paragraph', children: [{ text }] });
      continue;
    }
    if (node.nodeType !== 1) continue;
    blocks.push(...elementToBlocks(node as Element));
  }

  return blocks;
}
