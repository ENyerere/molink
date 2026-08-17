// 菜单行：弹层/侧栏里复制了 40+ 处的 hover:bg-accent 行的统一出口
// bleed=true 用于弹层内满宽行（无圆角，圆角由 MenuPopup 容器承担）
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  /** 右侧内容：快捷键提示、选中勾等 */
  trailing?: ReactNode;
  tone?: 'default' | 'muted' | 'danger';
  active?: boolean;
  size?: 'sm' | 'md';
  bleed?: boolean;
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  { icon, trailing, tone = 'default', active = false, size = 'md', bleed = false, className, children, type = 'button', ...rest },
  ref
) {
  const toneClass =
    tone === 'danger'
      ? 'text-destructive hover:bg-destructive-soft'
      : active
        ? 'bg-accent text-foreground font-medium'
        : tone === 'muted'
          ? 'text-secondary-foreground hover:bg-accent'
          : 'text-foreground hover:bg-accent';

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 text-left text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        size === 'sm' ? 'py-1.5' : 'py-2',
        !bleed && 'rounded-md',
        toneClass,
        className
      )}
      {...rest}
    >
      {icon}
      <span className="flex-1 min-w-0 truncate">{children}</span>
      {trailing}
    </button>
  );
});
