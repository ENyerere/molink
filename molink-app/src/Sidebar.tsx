import { useState } from 'react';
import type { PageData, User } from './App';
import { Search, Home, Briefcase, Inbox, Database, ChevronDown, Plus, Star, FileText } from 'lucide-react';
import UserMenu from './components/UserMenu';
import SettingsModal from './components/SettingsModal';

interface SidebarProps {
  pages: PageData[];
  activePageId: string | null;
  setActivePageId: (id: string) => void;
  addPage: () => void;
  user: User | null;
  onShowLogin?: () => void;
}

export default function Sidebar({
  pages,
  activePageId,
  setActivePageId,
  addPage,
  user,
  onShowLogin
}: SidebarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const activePage = pages.find(p => p.id === activePageId);

  // 最近访问的页面（前5个）
  const recentPages = pages.slice(0, 5);

  return (
    <div className="w-60 bg-background text-foreground flex flex-col border-r border-border h-full relative">
      {/* 工作区头部 */}
      <div className="px-3 py-2 flex items-center justify-between">
        <button
          onClick={() => setShowUserMenu(prev => !prev)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
        >
          {user ? (
            <>
              <div className="w-5 h-5 rounded-sm bg-secondary flex items-center justify-center text-xs font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground">{user.name} 的 Molink</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-sm bg-secondary flex items-center justify-center text-xs font-medium">
                M
              </div>
              <span className="text-sm font-medium text-foreground">Molink</span>
            </>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={addPage}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            title="新建页面"
          >
            <Plus className="w-4 h-4" />
          </button>
          {activePage && (
            <button
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
              title="收藏"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 用户菜单 */}
      <UserMenu
        isOpen={showUserMenu}
        onClose={() => setShowUserMenu(false)}
        userName={user?.name}
        userEmail={user?.email}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* 功能导航 */}
      <div className="px-1 py-1">
        <NavItem icon={Search} label="搜索" />
        <NavItem icon={Home} label="主页" />
        <NavItem icon={Briefcase} label="工作空间" />
        <NavItem icon={Inbox} label="收件箱" />
        <NavItem icon={Database} label="数据库" />
      </div>

      <div className="border-t border-border my-1 mx-3" />

      {/* 最近 */}
      {recentPages.length > 0 && (
        <div className="px-1 py-1">
          <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            最近
          </div>
          {recentPages.map(page => (
            <button
              key={page.id}
              onClick={() => setActivePageId(page.id)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                activePageId === page.id
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-secondary-foreground hover:bg-accent'
              }`}
            >
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{page.title || '未命名页面'}</span>
            </button>
          ))}
        </div>
      )}

      {/* 全部页面 */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          页面
        </div>
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => setActivePageId(page.id)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              activePageId === page.id
                ? 'bg-secondary text-foreground font-medium'
                : 'text-secondary-foreground hover:bg-accent'
            }`}
          >
            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{page.title || '未命名页面'}</span>
          </button>
        ))}
      </div>

      {/* 底部登录提示 */}
      {!user && (
        <div className="px-3 py-2 border-t border-border">
          <button
            onClick={() => onShowLogin?.()}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            登录 Molink
          </button>
        </div>
      )}

      {/* 设置弹窗 */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

function NavItem({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm text-secondary-foreground hover:bg-accent transition-colors">
      <Icon className="w-4 h-4 text-muted-foreground" />
      {label}
    </button>
  );
}
