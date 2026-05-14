import { useState, useEffect } from 'react';

interface AnimatedPresenceProps {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
  enterFrom?: string;
  enterTo?: string;
  className?: string;
  onExited?: () => void;
}

/**
 * 通用出现/消失动画包装器。
 * 自动处理 mount → animate-in → animate-out → unmount 的完整生命周期。
 * 所有弹窗/下拉/预览组件都应该用它包裹内容。
 */
export default function AnimatedPresence({
  show,
  children,
  duration = 200,
  enterFrom = 'opacity-0 scale-95',
  enterTo = 'opacity-100 scale-100',
  className = '',
  onExited,
}: AnimatedPresenceProps) {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setMounted(true);
      // 双 raf：第一帧让浏览器先绘制 enterFrom，第二帧再切到 enterTo，
      // 否则浏览器从来没看到过 enterFrom，transition 会被跳过。
      let raf2: number;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setAnimating(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    } else {
      setAnimating(false);
      const timer = setTimeout(() => {
        setMounted(false);
        onExited?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onExited]);

  if (!mounted) return null;

  return (
    <div
      className={`transition-all ease-out ${animating ? enterTo : enterFrom} ${className}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
