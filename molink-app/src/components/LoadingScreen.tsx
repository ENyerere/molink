import { useState, useEffect, useRef } from "react";
import { MolinkLogo } from "./MolinkLogo";

interface LoadingScreenProps {
  onFinish?: () => void;
}

/* 现代科技风加载屏：纯黑/纯白跟随主题（bg-background），灰阶加载指示，禁用彩色
   入场 220ms / 退场 360ms（时长表 base/slow），缓动 [0.22, 1, 0.36, 1] */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const ENTER_MS = 220;
const EXIT_MS = 360;

export default function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [entered, setEntered] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // 挂载后下一帧再切到入场态，让浏览器先绘制 opacity-0 以触发入场过渡
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    // 进度计时时长保持原实现：100/200/200/200ms 递进，到 100% 后停 400ms 再退场
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    const schedule = (target: number, delay: number, callback?: () => void) => {
      elapsed += delay;
      const timer = setTimeout(() => {
        setProgress(target);
        callback?.();
      }, elapsed);
      timers.push(timer);
    };

    schedule(25, 100);
    schedule(55, 200);
    schedule(80, 200);
    schedule(100, 200, () => {
      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
        const hideTimer = setTimeout(() => {
          setVisible(false);
          onFinishRef.current?.();
        }, EXIT_MS);
        timers.push(hideTimer);
      }, 400);
      timers.push(fadeTimer);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-toast flex flex-col items-center justify-center bg-background transition-opacity motion-reduce:transition-none"
      style={{
        opacity: fadeOut ? 0 : entered ? 1 : 0,
        transitionDuration: fadeOut ? `${EXIT_MS}ms` : `${ENTER_MS}ms`,
        transitionTimingFunction: EASE,
      }}
    >
      {/* Logo：currentColor 跟随主题前景色，保持 monochrome */}
      <div className="mb-10">
        <MolinkLogo size={72} color="currentColor" className="text-foreground" />
      </div>

      {/* 进度条：前景 10% 轨道 + 实色填充，纯灰阶 */}
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-foreground transition-[width] ease-out motion-reduce:transition-none"
          style={{
            width: `${progress}%`,
            transitionDuration: "220ms",
          }}
        />
      </div>

      {/* 进度数字 */}
      <div className="mt-4 text-xs tabular-nums text-muted-foreground">
        {progress}%
      </div>
    </div>
  );
}
