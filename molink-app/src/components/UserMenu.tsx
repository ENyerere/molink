import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Settings, Check, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, MenuItem, MenuPopup } from './ui';

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  onOpenSettings: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  isLoggedIn?: boolean;
}

export default function UserMenu({
  isOpen,
  onClose,
  userName = 'User',
  userEmail,
  onOpenSettings,
  triggerRef,
  isLoggedIn = false,
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
    setPos({ top: rect.bottom + 8, left: rect.left });
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
  }, [isOpen, onClose, triggerRef]);

  if (!mounted) return null;

  return (
    <MenuPopup
      ref={menuRef}
      elevation={2}
      rounded="xl"
      className="fixed w-72 z-[100] py-1 transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        top: pos.top,
        left: pos.left,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-4px)',
      }}
    >
      {/* 顶部操作 */}
      <div className="px-2 py-1 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
          className="flex-1 h-8 bg-transparent font-normal text-sm"
        >
          <Settings className="w-4 h-4" strokeWidth={1.75} />
          设置
        </Button>
      </div>

      <div className="border-t border-border my-1" />

      {/* 账号信息 */}
      <div className="px-3 py-2">
        {isLoggedIn && userEmail && (
          <div className="text-xs text-muted-foreground mb-2">{userEmail}</div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground">
              {isLoggedIn ? userName.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-sm text-foreground">
              {isLoggedIn ? `${userName} 的 Molink` : '临时工作空间'}
            </span>
          </div>
          {isLoggedIn && <Check className="w-4 h-4 text-foreground" strokeWidth={1.75} />}
        </div>
      </div>

      {isLoggedIn && (
        <>
          <div className="border-t border-border my-1" />

          {/* 账号操作（危险项） */}
          <div className="px-2 py-1">
            <MenuItem
              tone="danger"
              className="gap-2"
              icon={<LogOut className="w-4 h-4" strokeWidth={1.75} />}
              onClick={() => {
                onClose();
                signOut();
              }}
            >
              登出
            </MenuItem>
          </div>
        </>
      )}
    </MenuPopup>
  );
}
