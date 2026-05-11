import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Settings, UserPlus, Check, LogOut, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  onOpenSettings: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export default function UserMenu({
  isOpen,
  onClose,
  userName = 'User',
  userEmail,
  onOpenSettings,
  triggerRef,
}: UserMenuProps) {
  const { signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // mount / unmount 生命周期 + 动画
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 根据触发按钮计算菜单位置（fixed 定位，脱离 Sidebar 约束）
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef?.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  }, [isOpen, triggerRef]);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (triggerRef?.current && triggerRef.current.contains(e.target as Node)) {
          return;
        }
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return (
    <div
      ref={menuRef}
      className="fixed w-72 bg-popover rounded-lg shadow-xl border border-border z-[100] py-1 transition-all duration-150 ease-out"
      style={{
        top: pos.top,
        left: pos.left,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-4px)',
      }}
    >
      {/* 顶部操作 */}
      <div className="px-2 py-1 flex gap-2">
        <button
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md hover:bg-accent text-sm text-secondary-foreground border border-border transition-colors"
        >
          <Settings className="w-4 h-4" />
          设置
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md hover:bg-accent text-sm text-secondary-foreground border border-border transition-colors">
          <UserPlus className="w-4 h-4" />
          邀请成员
        </button>
      </div>

      <div className="border-t border-border my-1" />

      {/* 账号信息 */}
      <div className="px-3 py-2">
        {userEmail && (
          <div className="text-xs text-muted-foreground mb-2">{userEmail}</div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-foreground">{userName} 的 Molink</span>
          </div>
          <Check className="w-4 h-4 text-foreground" />
        </div>
      </div>

      <div className="border-t border-border my-1" />

      {/* 账号操作 */}
      <div className="py-1">
        <button className="w-full text-left px-3 py-2 text-sm text-secondary-foreground hover:bg-accent transition-colors">
          创建工作账号
        </button>
        <button className="w-full text-left px-3 py-2 text-sm text-secondary-foreground hover:bg-accent transition-colors">
          添加另一个账号
        </button>
        <button
          onClick={() => {
            onClose();
            signOut();
          }}
          className="w-full text-left px-3 py-2 text-sm text-secondary-foreground hover:bg-accent transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          登出
        </button>
      </div>

      <div className="border-t border-border my-1" />

      {/* 底部 */}
      <div className="px-3 py-2">
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Smartphone className="w-4 h-4" />
          获取移动应用程序
        </button>
      </div>
    </div>
  );
}
