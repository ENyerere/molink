// 全局路由/视图级加载指示：视口顶部 2px 前景色细条（nprogress 风格，纯 monochrome）
//
// 架构：进度条常驻 App 根部（portal 到 body，宽度严格铺满浏览器，不受 transformed 祖先影响）；
// 各处加载只通过 beginRouteLoad/endRouteLoad 登记（RouteLoadFallback 作为 Suspense fallback 自动登记），
// 进度条本身用 JS 状态机驱动：120ms 内完成的加载不显示 → trickle 缓速逼近 85%（不伪造完成）→
// 全部加载结束时冲到 100% → 淡出复位
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const SHOW_DELAY_MS = 120;
const CAP = 85;
const TRICKLE_TAU_MS = 900; // trickle 时间常数：约 0.9s 爬到 63% × CAP
const FINISH_MS = 160; // 冲到 100% 的时长
const FADE_MS = 220; // 淡出时长

// 模块级加载计数总线：支持多个并发加载源（Suspense chunk、整屏数据拉取）
let activeCount = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function beginRouteLoad() {
  activeCount += 1;
  emit();
}
function endRouteLoad() {
  activeCount = Math.max(0, activeCount - 1);
  emit();
}

/** Suspense fallback：不渲染 UI，只把挂载期登记为一次加载 */
export function RouteLoadFallback() {
  useEffect(() => {
    beginRouteLoad();
    return () => endRouteLoad();
  }, []);
  return null;
}

export function RouteProgress() {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    const bar = barRef.current;
    if (!track || !bar) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    const clearAll = () => {
      cancelAnimationFrame(raf);
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(resetTimer);
    };

    const onChange = () => {
      clearAll();
      if (activeCount > 0) {
        // 开始（或继续）加载：立即复位到 0，延迟后淡入并 trickle
        bar.style.transition = 'none';
        bar.style.transform = 'scaleX(0)';
        showTimer = setTimeout(() => {
          shownRef.current = true;
          track.style.opacity = '1';
          if (reduced) {
            bar.style.transform = 'scaleX(0.3)';
            return;
          }
          let w = 0;
          let last = performance.now();
          const tick = (now: number) => {
            const dt = now - last;
            last = now;
            w += (CAP - w) * Math.min(1, dt / TRICKLE_TAU_MS);
            bar.style.transform = `scaleX(${w / 100})`;
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }, SHOW_DELAY_MS);
      } else {
        // 全部加载结束：已显示则冲 100% → 淡出 → 复位；未显示过则保持隐藏
        if (!shownRef.current) return;
        shownRef.current = false;
        bar.style.transition = `transform ${FINISH_MS}ms ease-out`;
        bar.style.transform = 'scaleX(1)';
        fadeTimer = setTimeout(() => {
          track.style.opacity = '0';
        }, FINISH_MS);
        resetTimer = setTimeout(() => {
          bar.style.transition = 'none';
          bar.style.transform = 'scaleX(0)';
        }, FINISH_MS + FADE_MS + 60);
      }
    };

    listeners.add(onChange);
    onChange(); // 同步一次当前状态（如挂载时已在加载中）
    return () => {
      listeners.delete(onChange);
      clearAll();
    };
  }, []);

  return createPortal(
    <div
      ref={trackRef}
      className="fixed left-0 right-0 top-0 z-toast h-0.5"
      style={{ opacity: 0, transition: `opacity ${FADE_MS}ms ease` }}
    >
      <div ref={barRef} className="h-full origin-left bg-foreground" style={{ transform: 'scaleX(0)' }} />
    </div>,
    document.body
  );
}
