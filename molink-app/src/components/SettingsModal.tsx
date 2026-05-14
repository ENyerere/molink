import { useRef, useEffect, useState } from 'react';
import {
  X, User, SlidersHorizontal, Bell, LogOut, Sun, Moon, Monitor,
  Globe, Keyboard, Eye, Clock, Cookie, Trash2, Laptop, Mail,
  MessageCircle, AtSign, Zap, ChevronDown,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AnimatedThemeToggler } from './magicui/animated-theme-toggler';
import AnimatedPresence from './AnimatedPresence';

type SettingsTab = 'account' | 'preferences' | 'notifications';

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
      { id: 'notifications', label: '通知', icon: Bell },
    ],
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ================================================================ */
/*  Toggle Switch — Notion style                                    */
/* ================================================================ */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-primary' : 'bg-zinc-500 dark:bg-zinc-600'
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
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
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between py-5 gap-6">
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-card-foreground">{title}</div>
        {description && (
          <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0 pt-0.5">{action}</div>
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
/*  Ghost Button — Notion style                                     */
/* ================================================================ */
function GhostButton({ children, onClick, danger }: { children: React.ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 text-[13px] font-medium rounded-md border transition-colors ${
        danger
          ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'border-border text-secondary-foreground hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}

/* ================================================================ */
/*  Select Button — Notion style                                    */
/* ================================================================ */
function SelectButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-8 px-3 text-[13px] font-medium text-secondary-foreground border border-border rounded-md hover:bg-accent transition-colors flex items-center gap-2">
      {children}
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
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
      <h2 className="text-3xl font-bold text-card-foreground tracking-tight">我</h2>
      <p className="text-muted-foreground mt-2 text-[15px]">
        {isLoggedIn ? '管理你的档案、登录信息和设备' : '你当前正在以访客身份浏览'}
      </p>

      <Divider />

      <SectionTitle>账号</SectionTitle>

      <div className="flex items-start gap-4 py-5">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-2xl font-semibold text-secondary-foreground flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-medium text-card-foreground">偏好名称</div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="text"
              defaultValue={name}
              disabled={!isLoggedIn}
              className="h-9 px-3 text-sm bg-input border border-border rounded-md text-foreground outline-none focus:ring-2 focus:ring-ring w-48 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {isLoggedIn ? (
              <>
                使用 Molink 头像或
                <span className="text-primary hover:underline cursor-pointer">添加照片</span>
                或
                <span className="text-primary hover:underline cursor-pointer">创建自定义头像</span>
              </>
            ) : (
              '登录后可管理你的账号信息'
            )}
          </p>
        </div>
      </div>

      {isLoggedIn && (
        <>
          <Divider />

          <SectionTitle>账号安全</SectionTitle>

          <SettingRow
            title="邮件地址"
            description={email || '未绑定邮箱'}
            action={<GhostButton>管理电子邮件地址</GhostButton>}
          />

          <Divider />

          <SettingRow
            title="密码"
            description="更改用于登录的密码"
            action={<GhostButton>更改密码</GhostButton>}
          />

          <Divider />

          <SettingRow
            title="两步验证"
            description="为你的账号多加一层安全保障"
            action={<GhostButton>添加验证方法</GhostButton>}
          />

          <Divider />

          <SectionTitle>支持</SectionTitle>

          <SettingRow
            title="支持访问权限"
            description="授予 Molink 支持团队对你账号的临时访问权限，以便代表你解决问题或恢复内容。你可以随时撤销访问权限。"
            action={<Toggle checked={false} onChange={() => {}} />}
          />

          <Divider />

          <SettingRow
            title="删除我的账号"
            description="永久删除你的账号。你将无法再访问你的页面和你所属的任何工作空间。"
            action={<GhostButton danger>删除我的账号</GhostButton>}
          />

          <Divider />

          <SectionTitle>设备</SectionTitle>

          <div className="py-4">
            <div className="text-[15px] font-medium text-card-foreground">从所有设备登出</div>
            <p className="text-sm text-muted-foreground mt-1">登出其他设备上的所有活动会话（当前设备除外）</p>
            <button className="mt-3 h-8 px-3 text-[13px] font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              从所有设备登出
            </button>
          </div>
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
      <p className="text-muted-foreground mt-2 text-[15px]">选择你心仪的 Molink 外观和行为</p>

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

      <Divider />

      <SectionTitle>输入选项</SectionTitle>

      <SettingRow
        title="使用 Enter 键开始新的一行"
        description="适用于对话、评论和其他输入字段。按 Cmd/Ctrl + Enter 键发送。"
        action={<Toggle checked={true} onChange={() => {}} />}
      />

      <Divider />

      <SectionTitle>语言与时间</SectionTitle>

      <SettingRow
        title="语言"
        description="选择你希望以哪种语言使用 Molink"
        action={<SelectButton>简体中文</SelectButton>}
      />

      <Divider />

      <SettingRow
        title="数字格式"
        description="选择数字和货币的格式。默认情况下，系统会使用你的语言设置。"
        action={<SelectButton>默认</SelectButton>}
      />

      <Divider />

      <SettingRow
        title="始终显示文本方向控制"
        description="在编辑器中显示更改文本方向（从左到右或从右到左）的选项，无论你使用的是哪种语言"
        action={<Toggle checked={false} onChange={() => {}} />}
      />

      <Divider />

      <SettingRow
        title="拼写检查器语言"
        description="更改拼写检查器使用的语言。"
        action={<SelectButton>美国英语</SelectButton>}
      />

      <Divider />

      <SettingRow
        title="每周开始于周一"
        description="这将影响你的日历在 Molink 中的显示方式"
        action={<Toggle checked={true} onChange={() => {}} />}
      />

      <Divider />

      <SettingRow
        title="日期格式"
        description="设置新 @date 提及的默认格式"
        action={<SelectButton>相对日期</SelectButton>}
      />

      <Divider />

      <SettingRow
        title="使用你的位置自动设置时区"
        description="将根据你的时区发送提醒、通知和电子邮件"
        action={<Toggle checked={true} onChange={() => {}} />}
      />

      <Divider />

      <SettingRow
        title="时区"
        description="选择你的时区"
        action={<SelectButton>(GMT+8:00) 上海</SelectButton>}
      />

      <Divider />

      <SectionTitle>桌面应用</SectionTitle>

      <SettingRow
        title="新选项卡搜索"
        description="打开新选项卡时打开搜索。关闭时，新选项卡按你的默认页面设置显示。"
        action={<Toggle checked={true} onChange={() => {}} />}
      />

      <Divider />

      <SettingRow
        title="使用命令搜索"
        description="使用快捷键打开 Molink AI，即使应用未运行"
        action={<Toggle checked={false} onChange={() => {}} />}
      />

      <Divider />

      <SettingRow
        title="自动隐藏选项卡栏"
        description="在编辑器中工作时隐藏选项卡栏，享受简洁、专注的体验"
        action={<Toggle checked={true} onChange={() => {}} />}
      />

      <Divider />

      <SettingRow
        title="启动时"
        description="选择启动 Molink 时打开的页面"
        action={<SelectButton>继续之前的操作</SelectButton>}
      />

      <Divider />

      <SettingRow
        title="默认页面"
        description="选择在新窗口中打开的页面在切换工作空间时以及在不恢复选项卡和选项卡组的情况下启动应用时"
        action={<SelectButton>上次访问的页面</SelectButton>}
      />

      <Divider />

      <SectionTitle>隐私</SectionTitle>

      <SettingRow
        title="Cookie 设置"
        description="有关详细信息，请参阅 Cookie 声明"
        action={<SelectButton>自定义</SelectButton>}
      />

      <Divider />

      <SettingRow
        title="显示查看历史记录"
        description="拥有编辑或全部权限的人员将能查看你浏览页面的时间。"
        action={<Toggle checked={true} onChange={() => {}} />}
      />

      <Divider />

      <SettingRow
        title="个人资料可否被查看"
        description="知道你电子邮件地址的用户可在邀请你加入新工作空间时查看你的 Molink 名称和头像。"
        action={<Toggle checked={true} onChange={() => {}} />}
      />
    </div>
  );
}

/* ================================================================ */
/*  Notifications Page                                              */
/* ================================================================ */
function NotificationsPage() {
  const [emailDigest, setEmailDigest] = useState(true);
  const [browserPush, setBrowserPush] = useState(false);
  const [commentReply, setCommentReply] = useState(true);
  const [pageMention, setPageMention] = useState(true);
  const [workspaceUpdates, setWorkspaceUpdates] = useState(false);

  return (
    <div>
      <h2 className="text-3xl font-bold text-card-foreground tracking-tight">通知</h2>
      <p className="text-muted-foreground mt-2 text-[15px]">管理你接收通知的方式</p>

      <Divider />

      <SectionTitle>邮件通知</SectionTitle>

      <SettingRow
        title="活动摘要"
        description="接收关于你工作空间的每周活动摘要"
        action={<Toggle checked={emailDigest} onChange={setEmailDigest} />}
      />

      <Divider />

      <SettingRow
        title="重要更新"
        description="接收关于功能更新和安全提醒的邮件"
        action={<Toggle checked={false} onChange={() => {}} />}
      />

      <Divider />

      <SectionTitle>推送通知</SectionTitle>

      <SettingRow
        title="浏览器推送"
        description="在浏览器中接收实时通知"
        action={<Toggle checked={browserPush} onChange={setBrowserPush} />}
      />

      <Divider />

      <SettingRow
        title="工作空间更新"
        description="当工作空间有重要变化时通知你"
        action={<Toggle checked={workspaceUpdates} onChange={setWorkspaceUpdates} />}
      />

      <Divider />

      <SectionTitle>协作</SectionTitle>

      <SettingRow
        title="评论回复"
        description="当有人回复你的评论时通知你"
        action={<Toggle checked={commentReply} onChange={setCommentReply} />}
      />

      <Divider />

      <SettingRow
        title="页面提及"
        description="当有人在页面中 @ 你时通知你"
        action={<Toggle checked={pageMention} onChange={setPageMention} />}
      />

      <Divider />

      <SettingRow
        title="被添加为协作者"
        description="当你被邀请加入页面或工作空间时通知你"
        action={<Toggle checked={true} onChange={() => {}} />}
      />

      <Divider />

      <SectionTitle>提醒</SectionTitle>

      <SettingRow
        title="页面提醒"
        description="在页面中设置的提醒到达时通知你"
        action={<Toggle checked={true} onChange={() => {}} />}
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
    >
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
              {activeTab === 'notifications' && <NotificationsPage />}
            </div>
          </div>
        </div>
      </div>
    </AnimatedPresence>
  );
}
