import { useState } from 'react';
import { Inbox, FileText, Trash2, Plus, PenLine, Lock, ArrowRight } from 'lucide-react';
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

function getActivityIcon(type: Activity['type']) {
  switch (type) {
    case 'edit':
    case 'block-add':
    case 'block-delete':
      return <PenLine className="w-3.5 h-3.5" />;
    case 'delete': return <Trash2 className="w-3.5 h-3.5" />;
    case 'create': return <Plus className="w-3.5 h-3.5" />;
    case 'icon-change': return <PenLine className="w-3.5 h-3.5" />;
    default: return null;
  }
}

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

  const isBlockAdd = activity.type === 'block-add';
  const isBlockDelete = activity.type === 'block-delete';

  const showExpandButton = lines.length > MAX_PREVIEW_BLOCKS && !isExpanded;
  const displayLines = isExpanded ? lines : lines.slice(0, MAX_PREVIEW_BLOCKS);
  const remaining = lines.length - MAX_PREVIEW_BLOCKS;

  return (
    <div className="mt-3 space-y-1">
      {displayLines.map((line, i) => (
        <div
          key={i}
          className={
            isBlockAdd
              ? 'px-4 py-2.5 bg-primary/5 border border-primary/10 rounded-lg text-sm text-foreground leading-relaxed'
              : isBlockDelete
              ? 'px-4 py-2.5 bg-muted/50 rounded-lg'
              : 'px-3 py-2 bg-muted/50 rounded-lg text-sm text-secondary-foreground leading-relaxed'
          }
        >
          {isBlockDelete ? (
            <span className="text-sm text-muted-foreground line-through opacity-60">
              {line}
            </span>
          ) : (
            line
          )}
        </div>
      ))}
      {showExpandButton && (
        <button
          onClick={onExpand}
          className="w-full mt-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors text-center"
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

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Inbox className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">收件箱</h1>
          <p className="text-sm text-muted-foreground">工作空间中的最新动态</p>
        </div>
      </div>

      {/* 活动列表 */}
      <div className="space-y-0">
        {activities.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1">暂无动态</h3>
            <p className="text-sm text-muted-foreground">创建、编辑或删除页面后，这里会显示相关活动</p>
          </div>
        )}

        {activities.map((activity, idx) => {
          const isLast = idx === activities.length - 1;
          const isIconChange = activity.type === 'icon-change';
          const isBlockDelete = activity.type === 'block-delete';
          const isBlockAdd = activity.type === 'block-add';

          return (
            <div
              key={activity.id}
              className={`flex gap-4 py-5 ${!isLast ? 'border-b border-border' : ''}`}
            >
              {/* 左侧：用户头像 */}
              <div className="flex-shrink-0 pt-0.5">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground">
                  {activity.userInitial}
                </div>
              </div>

              {/* 右侧：内容 */}
              <div className="flex-1 min-w-0">
                {/* 操作描述 */}
                <div className="flex items-center gap-2 flex-wrap">
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
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span className="truncate">{activity.pageTitle || '无标题'}</span>
                    </button>
                  )}
                  <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                </div>

                {/* 时间 */}
                <div className="text-xs text-muted-foreground mt-1">
                  {formatRelativeTime(activity.timestamp)}
                </div>

                {/* 图标变更 */}
                {isIconChange && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">页面图标</span>
                    <div className="flex items-center gap-2">
                      {activity.oldIcon ? (
                        <PageIcon icon={activity.oldIcon} size={18} />
                      ) : (
                        <div className="w-[18px] h-[18px] rounded-full bg-muted border border-border" />
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
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
                  <div className="mt-3 px-3 py-2.5 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    已删除
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
