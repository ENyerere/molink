import { useRef, useEffect, useState } from 'react';
import {
  X, User, SlidersHorizontal, Sun, Moon, Monitor,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AnimatedThemeToggler } from './magicui/animated-theme-toggler';
import AnimatedPresence from './AnimatedPresence';

type SettingsTab = 'account' | 'preferences';

interface NavGroup {
  label: string;
  items: { id: SettingsTab; label: string; icon: React.ElementType }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '个人',
    items: [
      { id: 'account', label: '账号', icon: User },
      { id: 'preferences', label: '偏好', icon: SlidersHorizontal },
    ],
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ================================================================ */
/*  Setting Row — Notion style                                      */
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
        <div className="text-[15px] font-medium text-card-foreground">{title}</div>
        {description && (
          <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</div>
        )}
      </div>
      {action && <div className="flex-shrink-0 pt-0.5">{action}</div>}
    </div>
  );
}

/* ================================================================ */
/*  Section Title — Notion style (uppercase, muted)                 */
/* ================================================================ */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-10 mb-1">
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
      <h2 className="text-3xl font-bold text-card-foreground tracking-tight">我</h2>
      <p className="text-muted-foreground mt-2 text-[15px]">
        {isLoggedIn ? '查看你的账号信息' : '你当前正在以访客身份浏览'}
      </p>

      <Divider />

      <SectionTitle>账号</SectionTitle>

      <div className="flex items-start gap-4 py-5">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-2xl font-semibold text-secondary-foreground flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-medium text-card-foreground">偏好名称</div>
          <div className="mt-2 text-sm text-foreground">{name}</div>
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
/*  Preferences Page                                                */
/* ================================================================ */
function PreferencesPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div>
      <h2 className="text-3xl font-bold text-card-foreground tracking-tight">偏好</h2>
      <p className="text-muted-foreground mt-2 text-[15px]">选择你心仪的 Molink 外观</p>

      <Divider />

      <SectionTitle>外观</SectionTitle>

      <div className="flex items-start justify-between py-5 gap-6">
        <div className="flex-1">
          <div className="text-[15px] font-medium text-card-foreground">外观</div>
          <div className="text-sm text-muted-foreground mt-1">
            当前使用 {resolvedTheme === 'dark' ? '深色' : '浅色'} 模式
          </div>
        </div>
        <AnimatedThemeToggler className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" />
      </div>

      <div className="pb-2">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              theme === 'light'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${theme === 'light' ? 'text-primary' : 'text-secondary-foreground'}`}>
              日间
            </span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              theme === 'dark'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-primary' : 'text-secondary-foreground'}`}>
              夜间
            </span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              theme === 'system'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <Monitor className={`w-6 h-6 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${theme === 'system' ? 'text-primary' : 'text-secondary-foreground'}`}>
              跟随系统
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Main SettingsModal                                              */
/* ================================================================ */
export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const availableNavGroups = isLoggedIn
    ? NAV_GROUPS
    : [{ label: '个人', items: [{ id: 'preferences' as SettingsTab, label: '偏好', icon: SlidersHorizontal }] }];

  const allAvailableItems = availableNavGroups.flatMap((g) => g.items);
  const firstAvailableTab = allAvailableItems[0]?.id ?? 'preferences';

  const [activeTab, setActiveTab] = useState<SettingsTab>(firstAvailableTab);
  const modalRef = useRef<HTMLDivElement>(null);

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
      duration={200}
      enterFrom="opacity-0"
      enterTo="opacity-100"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

        {/* 弹窗主体 — 参考 Notion 比例 */}
        <div
          ref={modalRef}
          className="relative bg-card rounded-xl shadow-2xl w-full max-w-[960px] h-[85vh] flex overflow-hidden transition-all duration-200 ease-out"
          style={{
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? 'scale(1)' : 'scale(0.96)',
          }}
        >
          {/* 左侧导航 */}
          <div className="w-60 flex-shrink-0 border-r border-border flex flex-col bg-card">
            {/* 用户信息 */}
            <div className={`px-4 py-5 ${isLoggedIn ? 'border-b border-border' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground flex-shrink-0">
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

            {/* 导航分组 */}
            <nav className="flex-1 overflow-y-auto py-2">
              {availableNavGroups.map((group) => (
                <div key={group.label} className="mb-2">
                  <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                          isActive
                            ? 'text-foreground font-medium bg-secondary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 flex flex-col min-w-0 bg-background">
            {/* 标题栏 */}
            <div className={`flex items-center px-6 py-3.5 flex-shrink-0 ${isLoggedIn ? 'justify-between border-b border-border' : 'justify-end'}`}>
              {isLoggedIn && (
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {tabLabel}
                </span>
              )}
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 滚动内容区 */}
            <div className="flex-1 overflow-y-auto px-8 py-8">
              {activeTab === 'account' && <AccountPage />}
              {activeTab === 'preferences' && <PreferencesPage />}
            </div>
          </div>
        </div>
    </AnimatedPresence>
  );
}
