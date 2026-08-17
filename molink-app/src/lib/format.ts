// 时间显示格式化（全站统一，此前 HomeView / InboxView 各有一份且行为不一致）

// 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / N 周前 / N 个月前 / N 年前
export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '未知时间';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '未知时间';
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} 周前`;
  if (diffMonth < 12) return `${diffMonth} 个月前`;
  return `${diffYear} 年前`;
}
