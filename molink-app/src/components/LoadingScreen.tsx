import { useState, useEffect } from "react";
import { MolinkLogo } from "./MolinkLogo";

interface LoadingScreenProps {
  onFinish?: () => void;
}

export default function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 模拟加载进度
    const steps = [
      { target: 25, delay: 100 },
      { target: 55, delay: 300 },
      { target: 80, delay: 250 },
      { target: 100, delay: 400 },
    ];

    let current = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    steps.forEach(({ target, delay }) => {
      const timer = setTimeout(() => {
        setProgress(target);
        current = target;

        if (target === 100) {
          // 加载完成，先淡出再隐藏
          const fadeTimer = setTimeout(() => {
            setFadeOut(true);
            const hideTimer = setTimeout(() => {
              setVisible(false);
              onFinish?.();
            }, 600);
            timers.push(hideTimer);
          }, 400);
          timers.push(fadeTimer);
        }
      }, delay + (current === 0 ? 0 : 200));
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-600"
      style={{
        background: "#09090b",
        opacity: fadeOut ? 0 : 1,
        transitionDuration: fadeOut ? "600ms" : "0ms",
      }}
    >
      {/* Logo */}
      <div className="mb-10">
        <MolinkLogo size={72} variant="pure" />
      </div>

      {/* 进度条容器 */}
      <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
            transitionDuration: "400ms",
          }}
        />
      </div>

      {/* 进度文字 */}
      <div className="mt-4 text-xs text-zinc-500 font-mono tracking-wider">
        {progress}%
      </div>
    </div>
  );
}
