import { useMemo, useState } from 'react';
import { Inbox, FileText, Lock, ArrowRight } from 'lucide-react';
import { PageIcon } from './IconPicker';
import type { Activity } from '../App';

interface InboxViewProps {
  activities: Activity[];
  onNavigate: (pageId: string) => void;
}

const MAX_PREVIEW_BLOCKS = 5;

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function getActivityLabel(type: Activity['type']) {
  switch (type) {
    case 'edit':
    case 'block-add':
    case 'block-delete':
      return '编辑了';
    case 'delete': return '删除了';
    case 'create': return '创建了';
    case 'icon-change': return '编辑了';
    default: return '';
  }
}

// 日期分桶：0 = 今天，1 = 昨天，2 = 更早（按自然日边界比较）
function dateBucketIndex(iso: string): number {
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000);
  if (diffDays <= 0) return 0;
  if (diffDays === 1) return 1;
  return 2;
}

const GROUP_LABELS = ['今天', '昨天', '更早'];

function BlockPreview({
  activity,
  isExpanded,
  onExpand,
}: {
  activity: Activity;
  isExpanded: boolean;
  onExpand: () => void;
}) {
  const lines = activity.preview?.split('\n') || [];
  if (lines.length === 0) return null;

  const isBlockDelete = activity.type === 'block-delete';

  const showExpandButton = lines.length > MAX_PREVIEW_BLOCKS && !isExpanded;
  const displayLines = isExpanded ? lines : lines.slice(0, MAX_PREVIEW_BLOCKS);
  const remaining = lines.length - MAX_PREVIEW_BLOCKS;

  return (
    <div className="mt-2.5 space-y-1">
      {displayLines.map((line, i) => (
        <div
          key={i}
          className="px-3.5 py-2 bg-muted/50 rounded-lg text-sm leading-relaxed"
        >
          {isBlockDelete ? (
            <span className="text-muted-foreground line-through opacity-60">
              {line}
            </span>
          ) : (
            <span className="text-foreground">{line}</span>
          )}
        </div>
      ))}
      {showExpandButton && (
        <button
          onClick={onExpand}
          className="w-full mt-1 px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors duration-100 text-center"
        >
          查看其余 {remaining} 项
        </button>
      )}
    </div>
  );
}

export default function InboxView({ activities, onNavigate }: InboxViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const expand = (id: string) =>
    setExpandedIds((prev) => new Set(prev).add(id));

  // 按日期分组（今天 / 昨天 / 更早），保持原有时间倒序
  const groups = useMemo(() => {
    const buckets: Activity[][] = [[], [], []];
    for (const activity of activities) {
      buckets[dateBucketIndex(activity.timestamp)].push(activity);
    }
    return buckets
      .map((items, i) => ({ label: GROUP_LABELS[i], items }))
      .filter((g) => g.items.length > 0);
  }, [activities]);

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* 头部 */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">收件箱</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">工作空间中的最新动态</p>
      </header>

      {/* 空状态：单色大图标 + 引导文案（与主页同风格） */}
      {activities.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Inbox className="h-7 w-7 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <h3 className="text-base font-medium text-foreground">暂无动态</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            创建、编辑或删除页面后，这里会显示相关活动
          </p>
        </div>
      )}

      {/* 分组活动列表 */}
      {groups.map((group) => (
        <section key={group.label} className="mb-8 last:mb-0">
          {/* 分组标题（11-12px muted） */}
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            {group.label}
          </h2>

          <div className="divide-y divide-border">
            {group.items.map((activity) => {
              const isIconChange = activity.type === 'icon-change';
              const isBlockDelete = activity.type === 'block-delete';
              const isBlockAdd = activity.type === 'block-add';

              return (
                <div key={activity.id} className="flex gap-3 py-4">
                  {/* 左侧：用户头像 */}
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground">
                      {activity.userInitial}
                    </div>
                  </div>

                  {/* 中间：描述 + 预览 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-sm font-medium text-foreground">{activity.userName}</span>
                      <span className="text-sm text-muted-foreground">{getActivityLabel(activity.type)}</span>
                      {activity.type === 'delete' ? (
                        <span className="text-sm font-medium text-foreground line-through opacity-60">
                          {activity.pageTitle || '无标题'}
                        </span>
                      ) : (
                        <button
                          onClick={() => onNavigate(activity.pageId)}
                          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                        >
                          {activity.pageIcon ? (
                            <PageIcon icon={activity.pageIcon} size={14} />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                          )}
                          <span className="truncate">{activity.pageTitle || '无标题'}</span>
                        </button>
                      )}
                      <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" strokeWidth={1.75} />
                    </div>

                    {/* 图标变更 */}
                    {isIconChange && (
                      <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">页面图标</span>
                        <div className="flex items-center gap-2">
                          {activity.oldIcon ? (
                            <PageIcon icon={activity.oldIcon} size={18} />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full bg-muted border border-border" />
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                          {activity.newIcon ? (
                            <PageIcon icon={activity.newIcon} size={18} />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full bg-muted border border-border" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* 块级预览：新增 / 删除 / 编辑 */}
                    {(isBlockAdd || isBlockDelete || activity.type === 'edit') &&
                      activity.preview && (
                        <BlockPreview
                          activity={activity}
                          isExpanded={expandedIds.has(activity.id)}
                          onExpand={() => expand(activity.id)}
                        />
                      )}

                    {/* 删除页面 */}
                    {activity.type === 'delete' && (
                      <div className="mt-2.5 px-3.5 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                        已删除
                      </div>
                    )}
                  </div>

                  {/* 右侧：相对时间 */}
                  <div className="flex-shrink-0 pt-1.5 text-xs text-muted-foreground">
                    {formatRelativeTime(activity.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
