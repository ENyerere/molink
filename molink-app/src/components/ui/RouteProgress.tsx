// 路由/视图级加载指示：视口顶部 2px 前景色细条（nprogress 风格，纯 monochrome）
// 替代 spinner 作为 Suspense fallback 与整屏加载态：
// - 120ms 内完成的加载完全不显示，避免闪烁
// - trickle 动画缓速爬升逼近 85% 停住，只表达"正在加载"，不伪造完成
// - 加载结束随 Suspense fallback 卸载直接消失
// 注意必须经 portal 挂到 document.body：父级（如视图过渡的 motion.div）带 transform 时
// fixed 定位会退化为相对该祖先，导致细条宽度不等于浏览器宽度
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const SHOW_DELAY_MS = 120;

export function RouteProgress() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return createPortal(
    <div className="fixed left-0 right-0 top-0 z-toast h-0.5">
      <div className="h-full origin-left animate-route-progress bg-foreground motion-reduce:animate-none motion-reduce:scale-x-[0.3]" />
    </div>,
    document.body
  );
}
