// 访客模式（未登录）的本地页面存储：读写、清除与封面位置
// 统一走 lib/storage 的容错封装，key 常量在 STORAGE_KEYS 收敛
import type { PageData } from '../types';
import { STORAGE_KEYS, loadJSON, saveJSON, removeKey } from './storage';

export function loadLocalPages(): PageData[] {
  return loadJSON<PageData[]>(STORAGE_KEYS.pages, []);
}

export function saveLocalPages(pages: PageData[]): void {
  if (saveJSON(STORAGE_KEYS.pages, pages)) return;
  // 存储配额超限（多为 base64 封面过大）：去掉本地封面后重试一次，保住正文数据
  console.error('保存本地页面失败，尝试去除封面后重试');
  const stripped = pages.map(p => (p.cover?.startsWith('data:') ? { ...p, cover: undefined } : p));
  if (!saveJSON(STORAGE_KEYS.pages, stripped)) {
    console.error('保存本地页面失败：存储空间不足，请减少封面图片或页面数量');
  }
}

export function clearLocalPages(): void {
  removeKey(STORAGE_KEYS.pages);
}

export function loadCoverPositions(): Record<string, number> {
  return loadJSON<Record<string, number>>(STORAGE_KEYS.coverPositions, {});
}

export function saveCoverPosition(pageId: string, position: number): void {
  const positions = loadCoverPositions();
  positions[pageId] = position;
  saveJSON(STORAGE_KEYS.coverPositions, positions);
}
