import { useState, useMemo, useRef } from 'react';
import type { PageData, User } from './App';
import {
  Search, Home, Briefcase, Inbox, Database,
  ChevronDown, ChevronRight, Plus, Star, FileText, Trash2, MoreHorizontal,
  RotateCcw, X, User as UserIcon, Users
} from 'lucide-react';
import { PageIcon } from './components/IconPicker';
import UserMenu from './components/UserMenu';
import SettingsModal from './components/SettingsModal';
import AnimatedPresence from './components/AnimatedPresence';

interface SidebarProps {
  pages: PageData[];
  activePageId: string | null;
  setActivePageId: (id: string) => void;
  addPage: (parentId?: string) => void;
  closePage: (id: string) => void;
  restorePage?: (id: string) => void;
  permanentDeletePage?: (id: string) => void;
  user: User | null;
  onShowLogin?: () => void;
  activeView?: 'page' | 'home' | 'inbox';
  onSetView?: (view: 'page' | 'home' | 'inbox') => void;
  onShowSearch?: () => void;
  onShowWorkspace?: () => void;
}

// ============================================================
// 树形结构
// ============================================================
interface TreeNode {
  page: PageData;
  children: TreeNode[];
}

function buildTree(pages: PageData[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  pages.forEach(p => map.set(p.id, { page: p, children: [] }));
  const roots: TreeNode[] = [];
  pages.forEach(p => {
    if (p.parentId && map.has(p.parentId)) {
      map.get(p.parentId)!.children.push(map.get(p.id)!);
    } else {
      roots.push(map.get(p.id)!);
    }
  });
  return roots;
}

// ============================================================
// 可折叠分类区域组件
// ============================================================
function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div
        className="flex items-center justify-between px-3 py-1 cursor-pointer rounded-md hover:bg-accent transition-colors"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {hovered && (
            <button
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 flex items-center justify-center rounded-sm hover:bg-accent/50 flex-shrink-0"
            >
              {expanded ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
        {hovered && (
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground flex-shrink-0"
            title="更多"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        )}
      </div>
      {expanded && children}
    </>
  );
}

// ============================================================
// 页面树项（递归）
// ============================================================
function PageTreeItem({
  node,
  depth,
  activePageId,
  autoExpanded,
  onActivate,
  onAddChild,
  onClose,
}: {
  node: TreeNode;
  depth: number;
  activePageId: string | null;
  autoExpanded: Set<string>;
  onActivate: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onClose: (id: string) => void;
}) {
  const isActive = activePageId === node.page.id;
  const isAutoExpanded = autoExpanded.has(node.page.id);
  const [userExpanded, setUserExpanded] = useState(false);
  const isExpanded = userExpanded || isAutoExpanded;
  const hasChildren = node.children.length > 0;
  const [isHovered, setIsHovered] = useState(false);

  // 只有 hover 时才显示 toggle，替代 icon；移开鼠标后恢复 icon
  const showToggle = isHovered;

  // 缩进：顶层不缩进，每深一层 +16px
  const paddingLeft = depth === 0 ? 12 : 12 + depth * 16;

  const handleToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUserExpanded((prev) => !prev);
  };

  const handleClick = () => {
    onActivate(node.page.id);
    if (hasChildren) {
      handleToggle();
    }
  };

  return (
    <div>
      {/* 页面项 */}
      <div
        className={`group flex items-center gap-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
          isActive
            ? 'bg-secondary text-foreground font-medium'
            : 'text-secondary-foreground hover:bg-accent'
        }`}
        style={{ paddingLeft: `${paddingLeft}px`, paddingRight: '12px' }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 左侧区域：默认显示 icon，hover 时显示 toggle */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {showToggle ? (
            <button
              onClick={(e) => handleToggle(e)}
              className="w-full h-full flex items-center justify-center rounded-sm hover:bg-accent/50"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : node.page.icon ? (
            <PageIcon icon={node.page.icon} size={16} />
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* 标题 */}
        <span className="truncate flex-1 text-left">
          {node.page.title || '未命名页面'}
        </span>

        {/* Hover 操作按钮 */}
        {isHovered && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node.page.id);
              }}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground"
              title="添加子页面"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(node.page.id);
              }}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground"
              title="删除页面"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 展开后的内容 */}
      {isExpanded && (
        <div>
          {hasChildren ? (
            node.children.map((child) => (
              <PageTreeItem
                key={child.page.id}
                node={child}
                depth={depth + 1}
                activePageId={activePageId}
                autoExpanded={autoExpanded}
                onActivate={onActivate}
                onAddChild={onAddChild}
                onClose={onClose}
              />
            ))
          ) : (
            <div
              className="py-1.5 text-sm text-muted-foreground/50"
              style={{ paddingLeft: `${paddingLeft + 20}px` }}
            >
              内无页面
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sidebar 主组件
// ============================================================
export default function Sidebar({
  pages,
  activePageId,
  setActivePageId,
  addPage,
  closePage,
  restorePage,
  permanentDeletePage,
  user,
  onShowLogin,
  activeView,
  onSetView,
  onShowSearch,
  onShowWorkspace,
}: SidebarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);

  const activePage = pages.find((p) => p.id === activePageId);

  const nonDeletedPages = useMemo(() => pages.filter(p => !p.deletedAt), [pages]);
  const trashPages = useMemo(() => pages.filter(p => p.deletedAt), [pages]);

  // 构建页面树
  const tree = useMemo(() => buildTree(nonDeletedPages), [nonDeletedPages]);

  // 计算需要自动展开的祖先节点（确保 activePage 可见）
  const autoExpandedIds = useMemo(() => {
    const auto = new Set<string>();
    if (!activePageId) return auto;
    let current = nonDeletedPages.find((p) => p.id === activePageId);
    while (current?.parentId) {
      auto.add(current.parentId);
      current = nonDeletedPages.find((p) => p.id === current!.parentId);
    }
    return auto;
  }, [nonDeletedPages, activePageId]);

  // 最近修改的页面（前5个，仅限顶层，按 updatedAt 降序）
  const recentPages = useMemo(() => {
    return pages
      .filter((p) => !p.parentId && !p.deletedAt)
      .sort((a, b) => {
        const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tB - tA;
      })
      .slice(0, 5);
  }, [pages]);
  // 从树中筛选出最近页面对应的节点（保留子节点关系）
  const recentNodes = useMemo(() => {
    const recentIds = new Set(recentPages.map((p) => p.id));
    return tree.filter((node) => recentIds.has(node.page.id));
  }, [tree, recentPages]);

  return (
    <div className="w-60 bg-background text-foreground flex flex-col border-r border-border h-full relative select-none">
      {/* 工作区头部 */}
      <div className="px-3 py-2 flex items-center gap-1">
        <button
          ref={userMenuTriggerRef}
          onClick={() => setShowUserMenu((prev) => !prev)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent transition-colors min-w-0 flex-1"
        >
          {user ? (
            <>
              <div className="w-5 h-5 rounded-sm bg-secondary flex items-center justify-center text-xs font-medium flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground truncate whitespace-nowrap">
                {user.name} 的 Molink
              </span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-sm bg-secondary flex items-center justify-center text-xs font-medium flex-shrink-0">
                M
              </div>
              <span className="text-sm font-medium text-foreground truncate whitespace-nowrap">
                Molink
              </span>
            </>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${
              showUserMenu ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => addPage()}
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
        triggerRef={userMenuTriggerRef}
        isLoggedIn={!!user}
      />

      {/* 功能导航 */}
      <div className="px-1 py-1">
        <NavItem icon={Search} label="搜索" onClick={onShowSearch} />
        <NavItem icon={Home} label="主页" isActive={activeView === 'home'} onClick={() => onSetView?.('home')} />
        <NavItem icon={Briefcase} label="工作空间" onClick={onShowWorkspace} />
        <NavItem icon={Inbox} label="收件箱" isActive={activeView === 'inbox'} onClick={() => onSetView?.('inbox')} />
        <NavItem icon={Database} label="数据库" />
      </div>

      <div className="border-t border-border my-1 mx-3" />

      {/* 最近 */}
      {recentPages.length > 0 && (
        <div className="px-1 py-1">
          <SidebarSection title="最近">
            {recentNodes.map((node) => (
              <PageTreeItem
                key={node.page.id}
                node={node}
                depth={0}
                activePageId={activePageId}
                autoExpanded={autoExpandedIds}
                onActivate={setActivePageId}
                onAddChild={addPage}
                onClose={closePage}
              />
            ))}
          </SidebarSection>
        </div>
      )}

      {/* 页面树 */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        <SidebarSection title="页面">
          {tree.map((node) => (
            <PageTreeItem
              key={node.page.id}
              node={node}
              depth={0}
              activePageId={activePageId}
              autoExpanded={autoExpandedIds}
              onActivate={setActivePageId}
              onAddChild={addPage}
              onClose={closePage}
            />
          ))}
        </SidebarSection>
      </div>

      {/* 回收站 */}
      {trashPages.length > 0 && (
        <div className="px-1 py-1 border-t border-border">
          <TrashPopover
            pages={trashPages}
            allPages={pages}
            onRestore={restorePage}
            onPermanentDelete={permanentDeletePage}
            onActivate={setActivePageId}
          />
        </div>
      )}

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

function TrashPopover({
  pages,
  allPages,
  onRestore,
  onPermanentDelete,
  onActivate,
}: {
  pages: PageData[];
  allPages: PageData[];
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onActivate: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return pages;
    const q = query.toLowerCase();
    return pages.filter(p => (p.title || '').toLowerCase().includes(q));
  }, [pages, query]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors text-secondary-foreground hover:bg-accent"
      >
        <Trash2 className="w-4 h-4 text-muted-foreground" />
        回收站
        <span className="ml-auto text-xs text-muted-foreground">{pages.length}</span>
      </button>

      <AnimatedPresence
        show={open}
        duration={150}
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      >
        {/* 透明遮罩，只拦截点击，不变暗 */}
        <div className="absolute inset-0" onClick={() => setOpen(false)} />
        {/* 弹窗 */}
        <div
          className="relative w-[560px] max-w-[90vw] bg-[#1e1e1e]/95 border border-border/50 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部搜索 */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2 bg-[#2a2a2a] border border-border/40 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="搜索被移入垃圾箱的页面"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 筛选标签 */}
          <div className="px-4 pb-2 flex items-center gap-2">
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <UserIcon className="w-3 h-3" />
              上次编辑者
              <ChevronDown className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-secondary text-secondary-foreground hover:bg-accent transition-colors">
              <FileText className="w-3 h-3" />
              页面
              <ChevronDown className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-secondary text-secondary-foreground hover:bg-accent transition-colors">
              <Users className="w-3 h-3" />
              团队协作区
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* 列表 */}
          <div className="flex-1 overflow-y-auto px-2 py-1 min-h-[120px] max-h-[360px]">
            {filtered.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">
                没有找到匹配的页面
              </div>
            ) : (
              filtered.map((page) => {
                const parent = page.parentId ? allPages.find(p => p.id === page.parentId) : null;
                return (
                  <div
                    key={page.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 group transition-colors"
                  >
                    <button
                      onClick={() => { onActivate(page.id); setOpen(false); }}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <PageIcon icon={page.icon} className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{page.title || '无标题'}</div>
                        {parent && (
                          <div className="text-xs text-muted-foreground truncate">{parent.title || '无标题'}</div>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onRestore?.(page.id)}
                        className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground"
                        title="恢复"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onPermanentDelete?.(page.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive"
                        title="永久删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 底部提示 */}
          <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between bg-[#1a1a1a]/60">
            <span className="text-xs text-muted-foreground">
              页面在垃圾箱中保留 30 天后将被自动删除
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </AnimatedPresence>
    </>
  );
}

function NavItem({ icon: Icon, label, isActive, onClick }: { icon: React.ElementType; label: string; isActive?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors ${
        isActive
          ? 'bg-secondary text-foreground font-medium'
          : 'text-secondary-foreground hover:bg-accent'
      }`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} />
      {label}
    </button>
  );
}
