// 弹层容器：bg-popover + 细描边 + 分级阴影的统一出口
// elevation/rounded 用 props 切换（shadow-1/2 是自定义 token 类，tailwind-merge 不会合并覆盖）
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface MenuPopupProps extends HTMLAttributes<HTMLDivElement> {
  /** 1 = 下拉/菜单（shadow-1），2 = 模态级浮层（shadow-2） */
  elevation?: 1 | 2;
  rounded?: 'lg' | 'xl';
}

export const MenuPopup = forwardRef<HTMLDivElement, MenuPopupProps>(function MenuPopup(
  { elevation = 1, rounded = 'lg', className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-popover border border-border',
        elevation === 2 ? 'shadow-2' : 'shadow-1',
        rounded === 'xl' ? 'rounded-xl' : 'rounded-lg',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
