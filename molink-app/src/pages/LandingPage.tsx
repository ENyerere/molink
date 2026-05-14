import { Globe } from "../components/magicui/globe";
import { MolinkLogo } from "../components/MolinkLogo";
import { TextAnimate } from "../components/magicui/text-animate";
import { BlurFade } from "../components/magicui/blur-fade";
import { Particles } from "../components/magicui/particles";
import type { COBEOptions } from "cobe";

interface LandingPageProps {
  onEnterWorkspace: () => void;
  onLogin: () => void;
}

const BRAND_GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [0.55, 0.65, 0.85],
  markerColor: [0.23, 0.51, 0.96],
  glowColor: [0.23, 0.51, 0.96],
  markers: [
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [31.2304, 121.4737], size: 0.06 },
    { location: [22.3193, 114.1694], size: 0.05 },
    { location: [35.6762, 139.6503], size: 0.06 },
    { location: [37.5665, 126.978], size: 0.05 },
    { location: [1.3521, 103.8198], size: 0.05 },
    { location: [40.7128, -74.006], size: 0.08 },
    { location: [51.5074, -0.1278], size: 0.07 },
    { location: [48.8566, 2.3522], size: 0.06 },
    { location: [52.52, 13.405], size: 0.06 },
  ],
};

export default function LandingPage({ onEnterWorkspace, onLogin }: LandingPageProps) {
  return (
    <div className="dark relative min-h-screen w-full overflow-hidden flex flex-col" style={{ background: "#09090b" }}>
      {/* 粒子背景 */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={120}
        ease={80}
        color="#3b82f6"
        size={0.5}
        staticity={40}
      />

      {/* 背景光晕 */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 65% 45%, rgba(59,130,246,0.15) 0%, transparent 60%)",
        }}
      />

      {/* 顶部导航 */}
      <BlurFade delay={0} duration={0.6}>
        <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6">
          <div className="flex items-center gap-3">
            <MolinkLogo size={28} variant="pure" />
            <span className="text-lg font-semibold text-white tracking-tight">
              Molink
            </span>
          </div>
          <button
            onClick={onLogin}
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Sign Up / Log In
          </button>
        </header>
      </BlurFade>

      {/* 主内容 */}
      <main className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-4 items-center">
          {/* 左侧文案 */}
          <div className="flex flex-col items-start">
            <TextAnimate
              as="h1"
              by="character"
              animation="blurInUp"
              duration={0.8}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight"
            >
              你的 AI 工作空间
            </TextAnimate>

            <BlurFade delay={0.4} duration={0.6}>
              <p className="mt-6 text-lg sm:text-xl text-zinc-400 leading-relaxed max-w-md">
                用模块化编辑器连接你的想法，让知识自然生长。
              </p>
            </BlurFade>

            <BlurFade delay={0.6} duration={0.6}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  onClick={onEnterWorkspace}
                  className="group relative h-12 px-8 bg-blue-500 text-white text-[15px] font-medium rounded-xl hover:bg-blue-400 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-400/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  开始使用
                </button>
              </div>
            </BlurFade>

            <BlurFade delay={0.8} duration={0.6}>
              <p className="mt-6 text-sm text-zinc-500">
                无需注册，即刻体验。
              </p>
            </BlurFade>
          </div>

          {/* 右侧视觉 */}
          <div className="relative hidden lg:flex items-center justify-center" style={{ height: 480, width: 480 }}>
            <Globe className="!max-w-[480px] !aspect-square" config={BRAND_GLOBE_CONFIG} />
          </div>
        </div>
      </main>

      {/* 底部 */}
      <BlurFade delay={1} duration={0.6}>
        <footer className="relative z-10 px-6 sm:px-10 py-6 text-center text-xs text-zinc-600">
          © 2025 Molink. 连接你的知识。
        </footer>
      </BlurFade>
    </div>
  );
}
