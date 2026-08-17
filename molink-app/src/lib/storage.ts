// localStorage 统一访问层：容错读写 + key 常量收敛
// 各模块不再裸写 localStorage.getItem/setItem + try/catch

export const STORAGE_KEYS = {
  /** 访客模式页面数据 */
  pages: 'molink-pages',
  /** 封面位置（百分比）按页面存 */
  coverPositions: 'molink-cover-positions',
  /** 主题偏好：light / dark / system */
  theme: 'molink-theme',
  /** 宽版内容列开关 */
  wideMode: 'molink-wide-mode',
  /** 活动日志按用户隔离；访客用固定后缀 */
  activities: (userId?: string) =>
    userId ? `molink-activities-${userId}` : 'molink-activities-guest',
} as const;

// 读取并解析 JSON；key 不存在或数据损坏时返回 fallback
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch {
    // 数据损坏 / localStorage 不可用时按 fallback 处理
  }
  return fallback;
}

// 写入 JSON；返回是否成功（配额超限等场景交给调用方决定降级策略）
export function saveJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage 不可用时忽略
  }
}
