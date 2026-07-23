import { Fragment } from 'react';
import {
  ChevronLeft, ChevronRight, Share2, Star, Lock, Maximize2, Minimize2,
} from 'lucide-react';
import { PageIcon } from './IconPicker';
import type { PageData } from '../App';

// 顶栏保存状态（由 App 基于防抖保存队列派生，仅作 UI 外显）
export interface SaveIndicatorState {
  status: 'idle' | 'saving' | 'saved';
  savedAt?: number;
}

interface TopbarProps {
  activeView: 'page' | 'home' | 'inbox';
  breadcrumbPath: PageData[];
  onNavigatePage: (id: string) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  saveIndicator: SaveIndicatorState;
  isGuest: boolean;
  wideMode: boolean;
  onToggleWide: () => void;
}

// 图标按钮统一样式：monochrome，hover 灰底，focus-visible 可见
const iconButtonClass =
  'p-1.5 rounded-md text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60';

// 保存状态指示：12px 灰字；saving 时带灰阶 pulse 圆点（尊重 reduced-motion）
function SaveStatus({ indicator, isGuest }: { indicator: SaveIndicatorState; isGuest: boolean }) {
  // 访客模式不写后端，内容随 localStorage 防抖持久化，统一静态提示
  if (isGuest) {
    return <span className="text-xs text-muted-foreground">已保存在本地</span>;
  }
  if (indicator.status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse motion-reduce:animate-none" />
        保存中…
      </span>
    );
  }
  if (indicator.status === 'saved' && indicator.savedAt) {
    const d = new Date(indicator.savedAt);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return <span className="text-xs text-muted-foreground">已保存 {hh}:{mm}</span>;
  }
  return null;
}

export default function Topbar({
  activeView,
  breadcrumbPath,
  onNavigatePage,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  saveIndicator,
  isGuest,
  wideMode,
  onToggleWide,
}: TopbarProps) {
  // 面包屑超过 3 段时收缩中间段为 "…"，只保留首尾（null 为省略段占位）
  const crumbs: (PageData | null)[] =
    breadcrumbPath.length > 3
      ? [breadcrumbPath[0], null, breadcrumbPath[breadcrumbPath.length - 1]]
      : breadcrumbPath;
  const lastPageId = breadcrumbPath[breadcrumbPath.length - 1]?.id;

  return (
    <div className="flex h-11 flex-shrink-0 items-center justify-between bg-background px-4">
      <div className="flex min-w-0 items-center gap-1">
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          className={`${iconButtonClass} ${!canGoBack ? 'cursor-not-allowed opacity-30 hover:bg-transparent' : ''}`}
          title="后退"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          className={`${iconButtonClass} ${!canGoForward ? 'cursor-not-allowed opacity-30 hover:bg-transparent' : ''}`}
          title="前进"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
        </button>

        {activeView === 'page' && breadcrumbPath.length > 0 && (
          <div className="ml-2 flex min-w-0 items-center gap-1">
            {crumbs.map((page, idx) =>
              page === null ? (
                <span key="breadcrumb-ellipsis" className="flex items-center gap-1">
                  <span className="mx-0.5 text-muted-foreground">/</span>
                  <span className="px-1 text-sm text-muted-foreground">…</span>
                </span>
              ) : (
                <Fragment key={page.id}>
                  {idx > 0 && (
                    <span className="mx-0.5 text-muted-foreground">/</span>
                  )}
                  <button
                    onClick={() => {
                      if (page.id !== lastPageId) onNavigatePage(page.id);
                    }}
                    className={`flex max-w-[140px] items-center gap-1 truncate rounded-sm text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                      page.id === lastPageId
                        ? 'cursor-default font-medium text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {/* 仅末段保留图标 + 标题 */}
                    {page.icon && page.id === lastPageId && (
                      <PageIcon icon={page.icon} size={14} />
                    )}
                    <span className="truncate">{page.title || '无标题'}</span>
                  </button>
                </Fragment>
              )
            )}
            <span className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" strokeWidth={1.75} />
              私人
            </span>
          </div>
        )}
        {activeView === 'home' && (
          <div className="ml-2 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">主页</span>
          </div>
        )}
        {activeView === 'inbox' && (
          <div className="ml-2 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">收件箱</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <SaveStatus indicator={saveIndicator} isGuest={isGuest} />
        <button
          disabled
          className="hidden cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:flex"
          title="分享功能即将推出"
        >
          <Share2 className="h-4 w-4" strokeWidth={1.75} />
          <span>分享</span>
        </button>
        {/* 收藏：占位按钮，功能未实现 */}
        <button className={iconButtonClass} title="收藏">
          <Star className="h-5 w-5" strokeWidth={1.75} />
        </button>
        {/* 宽版切换（替代原 ⋯ 死按钮） */}
        <button
          onClick={onToggleWide}
          className={iconButtonClass}
          title={wideMode ? '恢复默认宽度' : '加宽页面'}
        >
          {wideMode ? (
            <Minimize2 className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Maximize2 className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
      </div>
    </div>
  );
}
