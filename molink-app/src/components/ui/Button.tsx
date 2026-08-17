// 基础按钮：收敛全站散写的主/次/幽灵/危险按钮原子类串
// 注意：shadow/圆角等自定义 token 类不被 tailwind-merge 识别，差异一律走 props 而非 className 覆盖
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground transition-opacity hover:opacity-90',
  destructive: 'bg-destructive text-destructive-foreground transition-opacity hover:opacity-90',
  outline: 'border border-border bg-card text-foreground transition-colors hover:bg-accent',
  ghost: 'text-muted-foreground transition-colors hover:text-foreground hover:bg-accent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-[13px] rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'h-11 px-6 text-sm rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    />
  );
});
