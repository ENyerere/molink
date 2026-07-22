import { useMemo, useState } from 'react';
import { FileText, LayoutGrid, List } from 'lucide-react';
import type { PageData } from '../App';
import { getFileUrl } from '../api/client';

// ========== 工具函数 ==========
function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '未知时间';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
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

function stringToGradient(str: string): string {
  const gradients = [
    'from-rose-400/15 to-orange-400/15',
    'from-emerald-400/15 to-teal-400/15',
    'from-blue-400/15 to-indigo-400/15',
    'from-violet-400/15 to-purple-400/15',
    'from-amber-400/15 to-yellow-400/15',
    'from-cyan-400/15 to-sky-400/15',
    'from-pink-400/15 to-rose-400/15',
    'from-lime-400/15 to-green-400/15',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

// ========== 组件 ==========
interface HomeViewProps {
  pages: PageData[];
  onNavigate: (pageId: string) => void;
}

export default function HomeView({ pages, onNavigate }: HomeViewProps) {
  const [activeTab, setActiveTab] = useState<'recent' | 'shared' | 'project'>('recent');

  const recentPages = useMemo(() => {
    return [...pages]
      .filter((p) => !p.deletedAt)
      .sort((a, b) => Date.parse(b.updatedAt || '0') - Date.parse(a.updatedAt || '0'))
      .slice(0, 12);
  }, [pages]);

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* ========== 最近浏览 ========== */}
        <section>
          {/* Tab 栏 */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setActiveTab('recent')}
                className={`text-sm font-medium pb-1 transition-colors ${
                  activeTab === 'recent'
                    ? 'text-foreground border-b-2 border-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                最近浏览过
              </button>
              <button
                onClick={() => setActiveTab('shared')}
                className={`text-sm font-medium pb-1 transition-colors ${
                  activeTab === 'shared'
                    ? 'text-foreground border-b-2 border-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                共享的文件
              </button>
              <button
                onClick={() => setActiveTab('project')}
                className={`text-sm font-medium pb-1 transition-colors ${
                  activeTab === 'project'
                    ? 'text-foreground border-b-2 border-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                共享的项目
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                全部组织 ▾
              </span>
              <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                全部文件 ▾
              </span>
              <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                最近浏览 ▾
              </span>
              <div className="flex items-center gap-0.5 ml-1">
                <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 内容 */}
          {activeTab === 'recent' && recentPages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {recentPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => onNavigate(page.id)}
                  className="group text-left"
                >
                  {/* 缩略图 */}
                  <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-2.5 bg-muted transition-transform duration-200 group-hover:scale-[1.01]">
                    {page.cover ? (
                      <img
                        src={getFileUrl(page.cover)}
                        alt={page.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${stringToGradient(
                          page.id
                        )} flex items-center justify-center`}
                      >
                        <FileText className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  {/* 信息 */}
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-3 h-3 text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">
                        {page.title || '无标题'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        编辑于 {formatRelativeTime(page.updatedAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : activeTab === 'recent' ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">还没有页面</h3>
              <p className="text-sm text-muted-foreground">
                点击侧边栏的 + 按钮创建你的第一个页面
              </p>
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-sm text-muted-foreground">暂无内容</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
