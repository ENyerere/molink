// 文本输入件：bg-muted 无框 + focus ring 模式（搜索框/表单输入）的统一出口
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: 'sm' | 'md';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { inputSize = 'sm', className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full bg-muted text-foreground rounded-md placeholder:text-muted-foreground',
        'transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-ring/60',
        inputSize === 'sm' ? 'h-8 px-3 text-body-sm' : 'h-10 px-3.5 text-sm',
        className
      )}
      {...rest}
    />
  );
});
