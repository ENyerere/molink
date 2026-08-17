import { useEffect, useMemo, useState } from 'react';
import {
  X, User, Sun, Moon, Monitor, Info,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { MolinkLogo } from './MolinkLogo';
import AnimatedPresence from './AnimatedPresence';

type SettingsTab = 'account' | 'appearance' | 'about';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  requiresAuth?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '个人',
    items: [
      { id: 'account', label: '账号', icon: User, requiresAuth: true },
      { id: 'appearance', label: '外观', icon: Sun },
    ],
  },
  {
    label: '其他',
    items: [{ id: 'about', label: '关于', icon: Info }],
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ================================================================ */
/*  Setting Row                                                     */
/* ================================================================ */
function SettingRow({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between py-5 gap-6">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-card-foreground">{title}</div>
        {description && (
          <div className="text-body-sm text-muted-foreground mt-1 leading-relaxed">{description}</div>
        )}
      </div>
      {action && <div className="flex-shrink-0 pt-0.5">{action}</div>}
    </div>
  );
}

/* ================================================================ */
/*  Section Title（11px muted 小标题）                               */
/* ================================================================ */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-caption font-medium text-muted-foreground uppercase tracking-wider mt-8 mb-1">
      {children}
    </h3>
  );
}

/* ================================================================ */
/*  Divider                                                         */
/* ================================================================ */
function Divider() {
  return <div className="border-t border-border" />;
}

/* ================================================================ */
/*  Page Header（各设置页共用）                                       */
/* ================================================================ */
function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <>
      <h2 className="text-xl font-semibold text-card-foreground tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
      <div className="mt-6">
        <Divider />
      </div>
    </>
  );
}

/* ================================================================ */
/*  Account Page                                                    */
/* ================================================================ */
function AccountPage() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const name = user?.full_name || '访客';
  const email = user?.email;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div>
      <PageHeader
        title="账号"
        description={isLoggedIn ? '查看你的账号信息' : '你当前正在以访客身份浏览'}
      />

      <SectionTitle>资料</SectionTitle>

      <div className="flex items-center gap-4 py-5">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-xl font-semibold text-secondary-foreground flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-card-foreground">{name}</div>
          <div className="text-body-sm text-muted-foreground mt-0.5 truncate">
            {email || '未登录'}
          </div>
        </div>
      </div>

      {isLoggedIn && (
        <>
          <Divider />

          <SectionTitle>账号安全</SectionTitle>

          <SettingRow
            title="邮件地址"
            description={email || '未绑定邮箱'}
          />
        </>
      )}
    </div>
  );
}

/* ================================================================ */
/*  Appearance Page — 主题卡片式预览                                  */
/* ================================================================ */

// 迷你界面预览骨架（白/灰透明度阶梯，预览色固定、不随当前主题变化）
function MiniMock({ dark }: { dark: boolean }) {
  return (
    <div className={`h-full w-full p-1.5 ${dark ? 'bg-black' : 'bg-white'}`}>
      <div className={`h-1 w-2/3 rounded-full ${dark ? 'bg-white/30' : 'bg-black/20'}`} />
      <div className="mt-1.5 flex h-[calc(100%-0.625rem)] gap-1">
        <div className={`w-1/3 rounded-[3px] ${dark ? 'bg-white/10' : 'bg-black/[0.06]'}`} />
        <div className="flex-1 space-y-1 pt-0.5">
          <div className={`h-1 rounded-full ${dark ? 'bg-white/20' : 'bg-black/10'}`} />
          <div className={`h-1 w-3/4 rounded-full ${dark ? 'bg-white/20' : 'bg-black/10'}`} />
          <div className={`h-1 w-1/2 rounded-full ${dark ? 'bg-white/20' : 'bg-black/10'}`} />
        </div>
      </div>
    </div>
  );
}

function ThemePreview({ variant }: { variant: 'light' | 'dark' | 'system' }) {
  if (variant === 'system') {
    return (
      <div className="flex h-16 w-full overflow-hidden rounded-md border border-border">
        <div className="w-1/2">
          <MiniMock dark={false} />
        </div>
        <div className="w-1/2 border-l border-border">
          <MiniMock dark />
        </div>
      </div>
    );
  }
  return (
    <div className="h-16 w-full overflow-hidden rounded-md border border-border">
      <MiniMock dark={variant === 'dark'} />
    </div>
  );
}

function AppearancePage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options: { id: 'light' | 'dark' | 'system'; label: string; icon: React.ElementType }[] = [
    { id: 'light', label: '浅色', icon: Sun },
    { id: 'dark', label: '深色', icon: Moon },
    { id: 'system', label: '跟随系统', icon: Monitor },
  ];

  return (
    <div>
      <PageHeader
        title="外观"
        description={`选择你心仪的 Molink 外观，当前使用${resolvedTheme === 'dark' ? '深色' : '浅色'}模式`}
      />

      <SectionTitle>主题</SectionTitle>

      <div className="grid grid-cols-3 gap-3 py-5">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setTheme(option.id)}
              aria-pressed={isActive}
              className={`flex flex-col gap-2.5 rounded-lg border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? 'border-transparent ring-2 ring-ring'
                  : 'border-border hover:border-foreground/20'
              }`}
            >
              <ThemePreview variant={option.id} />
              <div className="flex items-center gap-1.5">
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                  strokeWidth={1.75}
                />
                <span
                  className={`text-body-sm ${
                    isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {option.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================ */
/*  About Page                                                      */
/* ================================================================ */
function AboutPage() {
  return (
    <div>
      <PageHeader title="关于" description="Molink 的产品信息" />

      <SectionTitle>产品</SectionTitle>

      <div className="flex items-center gap-4 py-5">
        {/* 品牌标志走单色（currentColor），不占装饰性 accent 预算 */}
        <MolinkLogo size={36} color="currentColor" className="text-foreground" />
        <div>
          <div className="text-sm font-medium text-card-foreground">Molink</div>
          <div className="text-body-sm text-muted-foreground mt-0.5">
            模块化工作空间 · 开源 · 自托管
          </div>
        </div>
      </div>

      <Divider />

      <SettingRow
        title="功能"
        description="块级富文本编辑器、无限层级页面树、多视图数据库。多人实时协作（规划中）。"
      />
    </div>
  );
}

/* ================================================================ */
/*  Main SettingsModal                                              */
/* ================================================================ */
export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // 未登录时隐藏需要登录态的导航项，并丢弃因此空掉的分组
  const availableNavGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => isLoggedIn || !item.requiresAuth),
      })).filter((group) => group.items.length > 0),
    [isLoggedIn]
  );

  const allAvailableItems = useMemo(
    () => availableNavGroups.flatMap((g) => g.items),
    [availableNavGroups]
  );
  const firstAvailableTab = allAvailableItems[0]?.id ?? 'appearance';

  const [activeTab, setActiveTab] = useState<SettingsTab>(firstAvailableTab);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // 打开弹窗时，如果当前 tab 对未登录用户不可用，自动切换到第一个可用 tab
  useEffect(() => {
    if (isOpen) {
      const isValidTab = allAvailableItems.some((item) => item.id === activeTab);
      if (!isValidTab) {
        setActiveTab(firstAvailableTab);
      }
    }
  }, [isOpen, activeTab, firstAvailableTab, allAvailableItems]);

  const tabLabel = allAvailableItems.find((i) => i.id === activeTab)?.label;

  return (
    <AnimatedPresence
      show={isOpen}
      duration={220}
      enterFrom="opacity-0"
      enterTo="opacity-100"
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* 弹窗主体：圆角 --radius-lg + shadow-2 */}
      <div
        className="relative bg-card rounded-xl shadow-2 w-full max-w-[880px] h-[85vh] flex overflow-hidden"
        style={{
          transform: isOpen ? 'scale(1)' : 'scale(0.98)',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* 左侧导航列 */}
        <div className="w-56 flex-shrink-0 border-r border-border bg-surface-1 flex flex-col">
          {/* 用户信息 */}
          <div className="px-4 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground flex-shrink-0">
                {user?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {user?.full_name || '访客'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.email || '未登录'}
                </div>
              </div>
            </div>
          </div>

          {/* 导航分组（激活项：bg-accent + 左侧 2px 灰阶指示条） */}
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {availableNavGroups.map((group) => (
              <div key={group.label} className="mb-3">
                <div className="px-3 pb-1.5 text-caption font-medium text-muted-foreground">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-100 ${
                        isActive
                          ? 'bg-accent text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                      style={isActive ? { boxShadow: 'inset 2px 0 0 hsl(var(--foreground))' } : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-border flex-shrink-0">
            <span className="text-xs font-medium text-muted-foreground">
              {tabLabel}
            </span>
            <button
              onClick={onClose}
              aria-label="关闭设置"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* 滚动内容区 */}
          <div className="flex-1 overflow-y-auto px-8 py-8">
            {activeTab === 'account' && <AccountPage />}
            {activeTab === 'appearance' && <AppearancePage />}
            {activeTab === 'about' && <AboutPage />}
          </div>
        </div>
      </div>
    </AnimatedPresence>
  );
}
