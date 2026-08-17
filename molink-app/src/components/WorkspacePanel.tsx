import { X, Briefcase, Users, FileText, Shield } from 'lucide-react';
import AnimatedPresence from './AnimatedPresence';
import type { Workspace } from '../api';

interface WorkspacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  pageCount: number;
  userName?: string;
}

export default function WorkspacePanel({ isOpen, onClose, workspace, pageCount, userName }: WorkspacePanelProps) {
  const members = [
    { id: '1', name: userName || '我', role: 'owner' as const, initial: (userName || '我').charAt(0) },
  ];

  return (
    <AnimatedPresence
      show={isOpen}
      duration={220}
      enterFrom="opacity-0"
      enterTo="opacity-100"
      className="fixed inset-0 z-overlay"
    >
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 面板：悬浮抽屉容器（rounded-xl + shadow-2 + border），全 monochrome */}
      <div className="absolute bottom-3 left-3 top-3 flex w-80 flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-2">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            {/* 图标底座用灰阶 secondary，不用彩色底 */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
              <Briefcase className="h-4 w-4 text-foreground" strokeWidth={1.75} />
            </div>
            <h2 className="text-sm font-semibold text-foreground">工作空间</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {/* 工作空间信息 */}
          <div>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              基本信息
            </h3>
            <div className="space-y-3 rounded-lg bg-surface-1 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">名称</span>
                <span className="text-sm font-medium text-foreground">
                  {workspace?.name || '我的空间'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">页面数</span>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-sm font-medium tabular-nums text-foreground">{pageCount}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">状态</span>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-sm font-medium text-foreground">私人</span>
                </div>
              </div>
            </div>
          </div>

          {/* 成员 */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Users className="h-4 w-4" strokeWidth={1.75} />
              成员
            </h3>
            <div className="space-y-1">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg bg-surface-1 px-3 py-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                    {member.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{member.name}</div>
                  </div>
                  <span className="flex-shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-caption text-muted-foreground">
                    {member.role === 'owner' ? '所有者' : '成员'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AnimatedPresence>
  );
}
