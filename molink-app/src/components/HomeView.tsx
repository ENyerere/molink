import { useMemo } from 'react';
import { FileText, Clock, Star, Home, ChevronRight, Sparkles } from 'lucide-react';
import { PageIcon } from './IconPicker';
import type { PageData } from '../App';

interface HomeViewProps {
  pages: PageData[];
  onNavigate: (pageId: string) => void;
}

export default function HomeView({ pages, onNavigate }: HomeViewProps) {
  const topLevelPages = useMemo(() => pages.filter(p => !p.parentId), [pages]);
  const recentPages = useMemo(() => {
    return [...pages]
      .sort((a, b) => Date.parse(b.updatedAt || '0') - Date.parse(a.updatedAt || '0'))
      .slice(0, 8);
  }, [pages]);

  // 用有 icon 的页面模拟收藏（后续可扩展 isFavorite 字段）
  const favoritePages = useMemo(() => {
    return pages.filter(p => p.icon).slice(0, 6);
  }, [pages]);

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* 欢迎区 */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">欢迎回来</h1>
            <p className="text-sm text-muted-foreground">查看最近的活动和快速访问你的页面</p>
          </div>
        </div>
      </div>

      {/* 快捷方式 */}
      {favoritePages.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Star className="w-3.5 h-3.5" />
            快捷方式
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {favoritePages.map(page => (
              <PageCard key={page.id} page={page} onClick={() => onNavigate(page.id)} />
            ))}
          </div>
        </section>
      )}

      {/* 最近访问 */}
      {recentPages.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            最近访问
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {recentPages.map((page, idx) => (
              <PageRow
                key={page.id}
                page={page}
                onClick={() => onNavigate(page.id)}
                isLast={idx === recentPages.length - 1}
              />
            ))}
          </div>
        </section>
      )}

      {/* 所有顶层页面 */}
      {topLevelPages.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Home className="w-3.5 h-3.5" />
            所有页面
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {topLevelPages.map((page, idx) => (
              <PageRow
                key={page.id}
                page={page}
                onClick={() => onNavigate(page.id)}
                isLast={idx === topLevelPages.length - 1}
              />
            ))}
          </div>
        </section>
      )}

      {pages.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">还没有页面</h3>
          <p className="text-sm text-muted-foreground">点击侧边栏的 + 按钮创建你的第一个页面</p>
        </div>
      )}
    </div>
  );
}

function PageCard({ page, onClick }: { page: PageData; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:bg-accent hover:border-muted-foreground/20 transition-all text-left"
    >
      {page.icon ? (
        <PageIcon icon={page.icon} size={20} />
      ) : (
        <FileText className="w-5 h-5 text-muted-foreground" />
      )}
      <span className="text-sm font-medium text-foreground truncate flex-1">
        {page.title || '无标题'}
      </span>
    </button>
  );
}

function PageRow({ page, onClick, isLast }: { page: PageData; onClick: () => void; isLast?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group ${
        !isLast ? 'border-b border-border' : ''
      } hover:bg-accent`}
    >
      {page.icon ? (
        <PageIcon icon={page.icon} size={18} />
      ) : (
        <FileText className="w-[18px] h-[18px] text-muted-foreground" />
      )}
      <span className="text-sm text-foreground flex-1 truncate">
        {page.title || '无标题'}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
