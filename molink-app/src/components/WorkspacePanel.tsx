import { X, Briefcase, Users, FileText, Database as DatabaseIcon, Shield } from 'lucide-react';
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
      duration={200}
      enterFrom="opacity-0"
      enterTo="opacity-100"
      className="fixed inset-0 z-[80]"
    >
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 面板 */}
      <div className="absolute left-0 top-0 bottom-0 w-80 bg-card border-r border-border shadow-2xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">工作空间</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* 工作空间信息 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              基本信息
            </h3>
            <div className="bg-muted/50 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-foreground">名称</span>
                <span className="text-sm font-medium text-foreground">
                  {workspace?.name || '我的空间'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-foreground">页面数</span>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{pageCount}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-foreground">状态</span>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-sm font-medium text-foreground">私人</span>
                </div>
              </div>
            </div>
          </div>

          {/* 成员 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              成员
            </h3>
            <div className="space-y-1">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/50"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground">
                    {member.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{member.name}</div>
                  </div>
                  <span className="text-[11px] text-muted-foreground px-2 py-0.5 bg-background rounded border border-border flex-shrink-0">
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
