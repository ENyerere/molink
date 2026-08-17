// 图上覆盖层工具条：封面等图片上方的半透明深色操作条（bg-black/50 + text-white 专用模式）
// 与 popover 令牌不同源——它叠加在图片上，不随亮/暗主题切换，永远深色半透
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** 覆盖层容器：分段按钮条（圆角 + 分段线，hover 显隐由父级控制） */
export function ImageOverlayBar({ className, children, ...rest }: BarProps) {
  return (
    <div className={cn('flex items-center bg-black/50 rounded overflow-hidden', className)} {...rest}>
      {children}
    </div>
  );
}

/** 覆盖层按钮：text-xs 白字，hover 增亮 */
export function ImageOverlayButton({ className, children, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn('px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/** 分段线 */
export function ImageOverlayDivider() {
  return <div className="w-px h-3 bg-white/20" />;
}
