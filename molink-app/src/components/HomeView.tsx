import { useMemo, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { PageIcon } from './IconPicker';
import { useAuth } from '../context/AuthContext';
import type { PageData } from '../App';
import { getFileUrl } from '../api/client';
import { formatRelativeTime } from '../lib/format';

// 按当前小时生成问候语
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

// ========== 空状态（单色大图标 + 引导文案 + 主按钮） ==========
function EmptyState({ onCreatePage }: { onCreatePage?: () => void }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <FileText className="h-7 w-7 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-medium text-foreground">还没有页面</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        创建你的第一个页面，开始记录与协作
      </p>
      {onCreatePage ? (
        <button
          onClick={onCreatePage}
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          新建页面
        </button>
      ) : (
        <p className="mt-3 text-body-sm text-muted-foreground">
          点击侧边栏的 + 按钮创建页面
        </p>
      )}
    </div>
  );
}

// ========== 组件 ==========
interface HomeViewProps {
  pages: PageData[];
  onNavigate: (pageId: string) => void;
  /** 可选：空状态主按钮的建页回调（由 App 接线后启用） */
  onCreatePage?: () => void;
}

export default function HomeView({ pages, onNavigate, onCreatePage }: HomeViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'recent' | 'shared' | 'project'>('recent');

  const recentPages = useMemo(() => {
    return [...pages]
      .filter((p) => !p.deletedAt)
      .sort((a, b) => Date.parse(b.updatedAt || '0') - Date.parse(a.updatedAt || '0'))
      .slice(0, 12);
  }, [pages]);

  const displayName = user?.full_name || user?.email?.split('@')[0] || '';
  const dateLine = new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const tabs: { id: 'recent' | 'shared' | 'project'; label: string }[] = [
    { id: 'recent', label: '最近浏览过' },
    { id: 'shared', label: '共享的文件' },
    { id: 'project', label: '共享的项目' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-10">
      {/* ========== 问候语 ========== */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {getGreeting()}
          {displayName ? `，${displayName}` : ''}
        </h1>
        <p className="mt-1.5 text-body-sm text-muted-foreground">{dateLine}</p>
      </header>

      {/* ========== 最近访问 ========== */}
      <section>
        {/* Tab 栏 */}
        <div className="flex items-center gap-5 mb-5 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-sm pb-2 -mb-px border-b-2 transition-colors duration-100 ${
                activeTab === tab.id
                  ? 'font-medium text-foreground border-foreground'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容 */}
        {activeTab === 'recent' && recentPages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentPages.map((page) => (
              <button
                key={page.id}
                onClick={() => onNavigate(page.id)}
                className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* 封面缩略（无封面时用灰阶占位，不做彩色渐变） */}
                <div className="aspect-[16/9] w-full overflow-hidden bg-surface-1">
                  {page.cover ? (
                    <img
                      src={getFileUrl(page.cover)}
                      alt={page.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.75} />
                    </div>
                  )}
                </div>
                {/* 信息 */}
                <div className="flex items-start gap-2.5 p-3.5">
                  <div className="mt-0.5 flex-shrink-0">
                    {page.icon ? (
                      <PageIcon icon={page.icon} size={16} />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-foreground">
                      {page.title || '无标题'}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      编辑于 {formatRelativeTime(page.updatedAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : activeTab === 'recent' ? (
          <EmptyState onCreatePage={onCreatePage} />
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm text-muted-foreground">暂无内容</p>
          </div>
        )}
      </section>
    </div>
  );
}
