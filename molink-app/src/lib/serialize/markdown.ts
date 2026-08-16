// Slate 内容 ↔ Markdown 双向转换
// 序列化覆盖全部块类型与行内标记；解析用于粘贴与导入，保持扁平块模型（不支持嵌套列表）
import type { Descendant } from 'slate';
import type { BlockElementType, CustomText, DatabaseColumn, DatabaseRow } from '../../BlockElement';
import { isSafeUrl, normalizeTopLevel, type SerializeOptions } from './shared';

/* ==================== Slate → Markdown ==================== */

// 行内标记合成。code 具有最高优先级且内部不再叠加其他标记（与解析端行为一致）；
// underline 无 Markdown 标准语法，降级为 <u> HTML 标签
export function serializeInlineMarkdown(children: CustomText[]): string {
  return children
    .map((t) => {
      if (!t.text) return '';
      if (t.code) return '`' + t.text + '`';
      let s = t.text;
      if (t.bold && t.italic) {
        s = `***${s}***`;
      } else {
        if (t.bold) s = `**${s}**`;
        if (t.italic) s = `*${s}*`;
      }
      if (t.strikethrough) s = `~~${s}~~`;
      if (t.underline) s = `<u>${s}</u>`;
      // 危险协议（javascript: 等）降级为纯文本，不导出可执行链接
      if (t.link && isSafeUrl(t.link)) s = `[${s}](${t.link})`;
      return s;
    })
    .join('');
}

// database 块 → Markdown 表格；单元格内的 | 与换行会破坏表格结构，需转义/压平
function databaseToMarkdown(columns: DatabaseColumn[], rows: DatabaseRow[]): string[] {
  if (columns.length === 0) return [];
  const esc = (v: unknown) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const header = '| ' + columns.map((c) => esc(c.name)).join(' | ') + ' |';
  const divider = '| ' + columns.map(() => '---').join(' | ') + ' |';
  const body = rows.map((r) => '| ' + columns.map((c) => esc(r[c.id])).join(' | ') + ' |');
  return [header, divider, ...body];
}

export function slateToMarkdown(content: Descendant[], options: SerializeOptions = {}): string {
  const blocks = normalizeTopLevel(content);
  const lines: string[] = [];
  // 有序列表序号按"连续 numbered-list 项"递增，与渲染层（BlockElement listNumber）逻辑一致
  let numbered = 0;

  for (const block of blocks) {
    if (block.type === 'numbered-list') numbered += 1;
    else numbered = 0;

    const inline = serializeInlineMarkdown(block.children);

    switch (block.type) {
      case 'heading-one':
        lines.push('# ' + inline);
        break;
      case 'heading-two':
        lines.push('## ' + inline);
        break;
      case 'heading-three':
        lines.push('### ' + inline);
        break;
      case 'heading-four':
        lines.push('#### ' + inline);
        break;
      case 'bulleted-list':
        lines.push('- ' + inline);
        break;
      case 'toggle-list':
        // 扁平模型下 toggle 无真折叠，按无序列表导出
        lines.push('- ' + inline);
        break;
      case 'numbered-list':
        lines.push(`${numbered}. ` + inline);
        break;
      case 'todo':
        lines.push((block.checked ? '- [x] ' : '- [ ] ') + inline);
        break;
      case 'blockquote':
        lines.push('> ' + inline);
        break;
      case 'emphasis-block':
        // 引用 + 加粗作为强调块的 Markdown 降级表达
        lines.push('> **' + inline + '**');
        break;
      case 'code-block': {
        const text = block.children.map((c) => c.text).join('');
        lines.push('```\n' + text + '\n```');
        break;
      }
      case 'math-block': {
        const text = block.children.map((c) => c.text).join('');
        lines.push('$$\n' + text + '\n$$');
        break;
      }
      case 'page-link': {
        const title = options.resolvePageTitle?.(block.pageId ?? '') || '页面';
        lines.push(`[${title}](molink://page/${block.pageId ?? ''})`);
        break;
      }
      case 'database':
        lines.push(...databaseToMarkdown(block.columns ?? [], block.rows ?? []));
        break;
      default:
        // paragraph：空段落保留为空行
        lines.push(inline);
    }
  }

  return lines.join('\n');
}

/* ==================== Markdown → Slate ==================== */

// 行内解析：按优先级匹配 code > link > bold+italic > bold > strike > underline > italic，
// 每次取全文最早出现的命中，递归解析其内部（code 除外，内部原样保留）
type InlinePattern = [RegExp, (m: RegExpExecArray, inner: CustomText[]) => CustomText[]];

const INLINE_PATTERNS: InlinePattern[] = [
  [/`([^`]+)`/, (m) => [{ text: m[1], code: true }]],
  [/\[([^\]]+)\]\(([^)\s]+)\)/, (m, inner) => inner.map((t) => ({ ...t, link: m[2] }))],
  [/\*\*\*([^*]+)\*\*\*/, (_m, inner) => inner.map((t) => ({ ...t, bold: true, italic: true }))],
  [/\*\*([^*]+)\*\*/, (_m, inner) => inner.map((t) => ({ ...t, bold: true }))],
  [/~~([^~]+)~~/, (_m, inner) => inner.map((t) => ({ ...t, strikethrough: true }))],
  [/<u>([\s\S]+?)<\/u>/, (_m, inner) => inner.map((t) => ({ ...t, underline: true }))],
  [/\*([^*]+)\*/, (_m, inner) => inner.map((t) => ({ ...t, italic: true }))],
];

export function parseInlineMarkdown(text: string): CustomText[] {
  if (!text) return [{ text: '' }];

  let earliest: { index: number; m: RegExpExecArray; apply: InlinePattern[1] } | null = null;
  for (const [re, apply] of INLINE_PATTERNS) {
    const m = re.exec(text);
    if (m && (earliest === null || m.index < earliest.index)) {
      earliest = { index: m.index, m, apply };
    }
  }
  if (!earliest) return [{ text }];

  const { m, apply } = earliest;
  const result: CustomText[] = [];
  const before = text.slice(0, m.index);
  const after = text.slice(m.index + m[0].length);
  if (before) result.push(...parseInlineMarkdown(before));
  result.push(...apply(m, parseInlineMarkdown(m[1])));
  if (after) result.push(...parseInlineMarkdown(after));
  return result;
}

const NUMBERED_RE = /^(\d+)\.\s+/;
const PAGE_LINK_RE = /^\[([^\]]*)\]\(molink:\/\/page\/([^)\s]+)\)$/;

export function markdownToBlocks(text: string): BlockElementType[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: BlockElementType[] = [];

  // ``` / ~~~ / $$ 围栏内的行原样累积，闭合时还原为代码块 / 公式块
  let fence: 'code' | 'math' | null = null;
  let fenceLines: string[] = [];

  const para = (raw: string): BlockElementType => ({
    type: 'paragraph',
    children: parseInlineMarkdown(raw),
  });

  for (const line of lines) {
    if (fence) {
      const trimmedEnd = line.trim();
      if ((fence === 'code' && (trimmedEnd === '```' || trimmedEnd === '~~~')) || (fence === 'math' && trimmedEnd === '$$')) {
        blocks.push({
          type: fence === 'code' ? 'code-block' : 'math-block',
          children: [{ text: fenceLines.join('\n') }],
        });
        fence = null;
        fenceLines = [];
      } else {
        fenceLines.push(line);
      }
      continue;
    }

    const trimmed = line.trimStart();

    if (trimmed === '```' || trimmed === '~~~') {
      fence = 'code';
      fenceLines = [];
      continue;
    }
    if (trimmed === '$$') {
      fence = 'math';
      fenceLines = [];
      continue;
    }

    // page-link 的 Markdown 形态：[标题](molink://page/<id>)，整行匹配才还原为链接块
    const pageLinkMatch = PAGE_LINK_RE.exec(trimmed);
    if (pageLinkMatch) {
      blocks.push({ type: 'page-link', pageId: pageLinkMatch[2], children: [{ text: '' }] });
      continue;
    }

    // 顺序很重要：先匹配更长的前缀
    if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
      blocks.push({ type: 'todo', checked: true, children: parseInlineMarkdown(trimmed.slice(6)) });
    } else if (trimmed.startsWith('- [ ] ')) {
      blocks.push({ type: 'todo', checked: false, children: parseInlineMarkdown(trimmed.slice(6)) });
    } else if (trimmed.startsWith('#### ')) {
      blocks.push({ type: 'heading-four', children: parseInlineMarkdown(trimmed.slice(5)) });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'heading-three', children: parseInlineMarkdown(trimmed.slice(4)) });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading-two', children: parseInlineMarkdown(trimmed.slice(3)) });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading-one', children: parseInlineMarkdown(trimmed.slice(2)) });
    } else if (trimmed.startsWith('>> ')) {
      blocks.push({ type: 'toggle-list', children: parseInlineMarkdown(trimmed.slice(3)) });
    } else if (trimmed.startsWith('> ')) {
      const inner = trimmed.slice(2);
      // 强调块的导出形态是 "> **…**"：整行被 ** 包裹时还原为 emphasis-block
      const emphasisMatch = /^\*\*([\s\S]+)\*\*$/.exec(inner);
      if (emphasisMatch) {
        blocks.push({ type: 'emphasis-block', children: parseInlineMarkdown(emphasisMatch[1]) });
      } else {
        blocks.push({ type: 'blockquote', children: parseInlineMarkdown(inner) });
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push({ type: 'bulleted-list', children: parseInlineMarkdown(trimmed.slice(2)) });
    } else if (NUMBERED_RE.test(trimmed)) {
      // 任意数字前缀都识别为有序列表（序号由序列化端重算，不保留原数字）
      blocks.push({ type: 'numbered-list', children: parseInlineMarkdown(trimmed.replace(NUMBERED_RE, '')) });
    } else {
      blocks.push(para(line));
    }
  }

  // 围栏未闭合的兜底：仍按对应块类型还原，避免丢内容
  if (fence) {
    blocks.push({
      type: fence === 'code' ? 'code-block' : 'math-block',
      children: [{ text: fenceLines.join('\n') }],
    });
  }

  return blocks;
}
