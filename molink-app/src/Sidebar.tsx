import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import type { PageData, User } from './App';
import {
  Search, Home, Briefcase, Inbox,
  ChevronDown, ChevronRight, Plus, FileText, Trash2,
  RotateCcw, X
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
          {/* 展开态指示（非按钮，点击整行即可折叠/展开） */}
          {hovered && (
            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
              {expanded ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" strokeWidth={1.75} />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" strokeWidth={1.75} />
              )}
            </span>
          )}
        </div>
      </div>
      {expanded && children}
    </>
  );
}

// ============================================================
// 页面树项（递归）
// ============================================================
interface PageTreeItemProps {
  node: TreeNode;
  depth: number;
  activePageId: string | null;
  autoExpanded: Set<string>;
  onActivate: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onClose: (id: string) => void;
}

// memo 化以减少 Sidebar 内无关状态（用户菜单、设置弹窗等）变化时的整树重渲染；
// 必须用匿名函数：递归处的 <PageTreeItem> 指向 memo 结果本身（命名函数表达式的内部名会遮蔽外层 const，导致子节点绕过缓存）
const PageTreeItem = memo(({
  node,
  depth,
  activePageId,
  autoExpanded,
  onActivate,
  onAddChild,
  onClose,
}: PageTreeItemProps) => {
  const isActive = activePageId === node.page.id;
  const isAutoExpanded = autoExpanded.has(node.page.id);
  // 用户手动展开/折叠优先于自动展开（null = 未手动干预）。
  // 否则激活页的祖先会被自动展开永远压住，用户无法折叠
  const [userExpandState, setUserExpandState] = useState<boolean | null>(null);
  const isExpanded = userExpandState ?? isAutoExpanded;
  const hasChildren = node.children.length > 0;
  const [isHovered, setIsHovered] = useState(false);

  // 只有 hover 时才显示 toggle，替代 icon；移开鼠标后恢复 icon
  const showToggle = isHovered;

  // 缩进：顶层不缩进，每深一层 +16px
  const paddingLeft = depth === 0 ? 12 : 12 + depth * 16;

  const handleToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUserExpandState((prev) => (prev === null ? !isExpanded : !prev));
  };

  const handleClick = () => {
    // 点击只做导航；展开/折叠统一走左侧 toggle 按钮，
    // 每次点击页面都翻转展开状态会与导航意图冲突
    onActivate(node.page.id);
  };

  return (
    <div>
      {/* 页面项：激活态 bg-accent + 左侧 2px 灰阶指示条 */}
      <div
        className={`group flex items-center gap-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
          isActive
            ? 'bg-accent text-foreground font-medium'
            : 'text-secondary-foreground hover:bg-accent'
        }`}
        style={{
          paddingLeft: `${paddingLeft}px`,
          paddingRight: '12px',
          ...(isActive ? { boxShadow: 'inset 2px 0 0 hsl(var(--foreground))' } : {}),
        }}
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
                <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              )}
            </button>
          ) : node.page.icon ? (
            <PageIcon icon={node.page.icon} size={16} />
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
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
              <Plus className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(node.page.id);
              }}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground"
              title="删除页面"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
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
});

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

  const nonDeletedPages = useMemo(() => pages.filter(p => !p.deletedAt), [pages]);
  const trashPages = useMemo(() => pages.filter(p => p.deletedAt), [pages]);

  // 构建页面树
  const tree = useMemo(() => buildTree(nonDeletedPages), [nonDeletedPages]);

  // id → 页面索引，供沿父链查找时 O(1) 取节点（替代 while 循环内反复 find 的 O(n·D)）
  const pagesById = useMemo(() => {
    const map = new Map<string, PageData>();
    for (const p of nonDeletedPages) map.set(p.id, p);
    return map;
  }, [nonDeletedPages]);

  // 计算需要自动展开的祖先节点（确保 activePage 可见）；visited 防御脏数据成环死循环
  const autoExpandedIds = useMemo(() => {
    const auto = new Set<string>();
    if (!activePageId) return auto;
    let current = pagesById.get(activePageId);
    const visited = new Set<string>();
    while (current?.parentId && !visited.has(current.parentId)) {
      visited.add(current.parentId);
      auto.add(current.parentId);
      current = pagesById.get(current.parentId);
    }
    return auto;
  }, [pagesById, activePageId]);

  // 最近修改的页面（前5个，仅限顶层，按 updatedAt 降序）。
  // 单次遍历维护有序 top5，避免 filter→sort→slice 的中间数组；
  // 时间戳相等时保持 pages 原有先后顺序，与原先的稳定性排序结果一致
  const recentPages = useMemo(() => {
    const top: { time: number; page: PageData }[] = [];
    for (const page of pages) {
      if (page.parentId || page.deletedAt) continue;
      const time = page.updatedAt ? new Date(page.updatedAt).getTime() : 0;
      let i = 0;
      while (i < top.length && top[i].time >= time) i++;
      top.splice(i, 0, { time, page });
      if (top.length > 5) top.pop();
    }
    return top.map(({ page }) => page);
  }, [pages]);

  // App.tsx 传入的 setActivePageId/addPage 是组件内普通函数、每次渲染更换身份，
  // closePage 虽经 useCallback 但依赖 pages/activePageId 同样频繁变更。
  // 用 ref 持有最新实现 + 空依赖 useCallback 生成身份稳定的包装，
  // PageTreeItem 的 memo 才不会因回调 prop 变化而每次失效
  const pageActionsRef = useRef({ setActivePageId, addPage, closePage });
  useEffect(() => {
    pageActionsRef.current = { setActivePageId, addPage, closePage };
  });
  const handleActivate = useCallback((id: string) => pageActionsRef.current.setActivePageId(id), []);
  const handleAddChild = useCallback((parentId: string) => { pageActionsRef.current.addPage(parentId); }, []);
  const handleClosePage = useCallback((id: string) => pageActionsRef.current.closePage(id), []);

  return (
    <div className="w-[260px] bg-surface-1 text-foreground flex flex-col border-r border-border h-full relative select-none">
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
            strokeWidth={1.75}
          />
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => addPage()}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            title="新建页面"
          >
            <Plus className="w-5 h-5" strokeWidth={1.75} />
          </button>
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
        <NavItem icon={Search} label="搜索" shortcut="⌘K" onClick={onShowSearch} />
        <NavItem icon={Home} label="主页" isActive={activeView === 'home'} onClick={() => onSetView?.('home')} />
        <NavItem icon={Briefcase} label="工作空间" onClick={onShowWorkspace} />
        <NavItem icon={Inbox} label="收件箱" isActive={activeView === 'inbox'} onClick={() => onSetView?.('inbox')} />
      </div>

      <div className="border-t border-border my-1 mx-3" />

      {/* 最近：扁平列表，只显示页面本身。
          原实现渲染完整子树，与下方"页面"区形成两份独立展开状态的重复树 */}
      {recentPages.length > 0 && (
        <div className="px-1 py-1">
          <SidebarSection title="最近">
            {recentPages.map((page) => (
              <div
                key={page.id}
                className={`group flex items-center gap-2 py-1.5 pl-3 pr-3 rounded-md text-sm cursor-pointer transition-colors ${
                  activePageId === page.id
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-secondary-foreground hover:bg-accent'
                }`}
                onClick={() => handleActivate(page.id)}
              >
                {page.icon ? (
                  <PageIcon icon={page.icon} size={16} />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={1.75} />
                )}
                <span className="truncate flex-1 text-left">{page.title || '未命名页面'}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClosePage(page.id);
                  }}
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground opacity-0 group-hover:opacity-100"
                  title="删除页面"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
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
              onActivate={handleActivate}
              onAddChild={handleAddChild}
              onClose={handleClosePage}
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
  // 行内二次确认：处于确认态的页面 id + 3 秒自动还原定时器
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return pages;
    const q = query.toLowerCase();
    return pages.filter(p => (p.title || '').toLowerCase().includes(q));
  }, [pages, query]);

  const clearConfirmTimer = () => {
    if (confirmTimer.current) {
      clearTimeout(confirmTimer.current);
      confirmTimer.current = null;
    }
  };

  // 删除行内二次确认：第一次点击进入确认态，3 秒内再点一次才执行；超时或关闭抽屉自动还原
  const handleDelete = (id: string) => {
    if (confirmId === id) {
      clearConfirmTimer();
      setConfirmId(null);
      onPermanentDelete?.(id);
      return;
    }
    clearConfirmTimer();
    setConfirmId(id);
    confirmTimer.current = setTimeout(() => setConfirmId(null), 3000);
  };

  const handleClose = () => {
    clearConfirmTimer();
    setConfirmId(null);
    setOpen(false);
  };

  // 卸载时清理未完成的确认定时器
  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors text-secondary-foreground hover:bg-accent"
      >
        <Trash2 className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
        回收站
        <span className="ml-auto text-xs text-muted-foreground">{pages.length}</span>
      </button>

      {/* 360px 抽屉式弹层：从左侧滑入，搜索 + 列表 + 行内恢复/删除 */}
      <AnimatedPresence
        show={open}
        duration={220}
        enterFrom="opacity-0 -translate-x-6"
        enterTo="opacity-100 translate-x-0"
        className="fixed inset-0 z-50"
      >
        {/* 透明遮罩，只拦截点击，不变暗 */}
        <div className="absolute inset-0" onClick={handleClose} />
        {/* 抽屉 */}
        <div
          className="absolute inset-y-0 left-0 w-[360px] max-w-[85vw] bg-popover border-r border-border shadow-2 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold text-foreground">回收站</span>
              <span className="text-xs text-muted-foreground">{pages.length} 个页面</span>
            </div>
            <button
              onClick={handleClose}
              title="关闭"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* 搜索 */}
          <div className="px-4 py-3 shrink-0">
            <div className="flex items-center gap-2 h-9 px-3 bg-muted rounded-md transition-shadow duration-150 focus-within:ring-2 focus-within:ring-ring/60">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={1.75} />
              <input
                autoFocus
                type="text"
                placeholder="搜索被移入垃圾箱的页面"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors duration-150">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 列表 */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
            {filtered.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">
                没有找到匹配的页面
              </div>
            ) : (
              filtered.map((page) => {
                const parent = page.parentId ? allPages.find(p => p.id === page.parentId) : null;
                const confirming = confirmId === page.id;
                return (
                  <div
                    key={page.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-colors duration-150 ${
                      confirming ? 'bg-destructive-soft' : 'hover:bg-accent'
                    }`}
                  >
                    <button
                      onClick={() => { onActivate(page.id); handleClose(); }}
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
                    {confirming ? (
                      /* 确认态：3 秒内再点"删除"执行永久删除，超时自动还原 */
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-destructive">确认删除？</span>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="h-7 px-2 rounded-md bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                          删除
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => onRestore?.(page.id)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                          title="恢复"
                        >
                          <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="p-1.5 rounded-md hover:bg-destructive-soft text-muted-foreground hover:text-destructive transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                          title="永久删除"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 底部提示 */}
          <div className="px-4 py-3 border-t border-border shrink-0">
            <span className="text-xs text-muted-foreground">
              回收站中的页面会长期保留，可随时恢复或彻底删除
            </span>
          </div>
        </div>
      </AnimatedPresence>
    </>
  );
}

function NavItem({ icon: Icon, label, isActive, shortcut, onClick }: { icon: React.ElementType; label: string; isActive?: boolean; shortcut?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors ${
        isActive
          ? 'bg-accent text-foreground font-medium'
          : 'text-secondary-foreground hover:bg-accent'
      }`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} strokeWidth={1.75} />
      {label}
      {shortcut && (
        <span className="ml-auto text-xs text-muted-foreground">{shortcut}</span>
      )}
    </button>
  );
}
