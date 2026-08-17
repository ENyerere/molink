import { useState, useEffect, useRef } from "react";
import { MolinkLogo } from "./MolinkLogo";

interface LoadingScreenProps {
  /** 真实启动进度 0-100（由 App 按引导里程碑喂入：登录恢复 → 数据就绪 → 完成） */
  progress: number;
  /** 当前阶段说明，如「正在恢复登录状态…」 */
  label?: string;
  onFinish?: () => void;
}

/* 现代科技风加载屏：纯黑/纯白跟随主题（bg-background），灰阶加载指示，禁用彩色
   入场 220ms / 退场 360ms（时长表 base/slow），缓动 [0.22, 1, 0.36, 1]
   进度只反映 App 喂入的真实里程碑，不做假的定时递增；
   唯一的时间干预是最短展示 600ms，防止快速启动时闪屏 */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const ENTER_MS = 220;
const EXIT_MS = 360;
const MIN_VISIBLE_MS = 600;
const FINISH_HOLD_MS = 200;

export default function LoadingScreen({ progress, label, onFinish }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [entered, setEntered] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const mountedAtRef = useRef(Date.now());

  // 挂载后下一帧再切到入场态，让浏览器先绘制 opacity-0 以触发入场过渡
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // 进度单调不减（防御性的；App 侧的里程碑计算本身单调）
  const shownRef = useRef(0);
  shownRef.current = Math.max(shownRef.current, Math.min(100, Math.max(0, progress)));
  const shown = shownRef.current;

  // 到达 100% 后：满足最短展示时长再短暂停留，然后淡出并通知完成
  useEffect(() => {
    if (shown < 100) return;
    const wait =
      Math.max(0, MIN_VISIBLE_MS - (Date.now() - mountedAtRef.current)) + FINISH_HOLD_MS;
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, wait);
    return () => clearTimeout(fadeTimer);
  }, [shown]);

  useEffect(() => {
    if (!fadeOut) return;
    const hideTimer = setTimeout(() => {
      setVisible(false);
      onFinishRef.current?.();
    }, EXIT_MS);
    return () => clearTimeout(hideTimer);
  }, [fadeOut]);

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
            width: `${shown}%`,
            transitionDuration: "220ms",
          }}
        />
      </div>

      {/* 进度数字 + 当前阶段 */}
      <div className="mt-4 text-xs tabular-nums text-muted-foreground">
        {Math.round(shown)}%
      </div>
      {label && (
        <div className="mt-1.5 text-caption text-muted-foreground/70">{label}</div>
      )}
    </div>
  );
}
