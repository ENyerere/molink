import { useState, useEffect, useRef } from "react";
import { MolinkLogo } from "./MolinkLogo";

interface LoadingScreenProps {
  onFinish?: () => void;
}

export default function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
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
        }, 600);
        timers.push(hideTimer);
      }, 400);
      timers.push(fadeTimer);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

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
