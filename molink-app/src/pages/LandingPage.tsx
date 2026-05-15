import { Globe } from "../components/magicui/globe";
import { MolinkLogo } from "../components/MolinkLogo";
import { TextAnimate } from "../components/magicui/text-animate";
import { BlurFade } from "../components/magicui/blur-fade";
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
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col bg-background">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Soft radial glow */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 45%, hsl(217 91% 60% / 0.06) 0%, transparent 60%)",
        }}
      />

      {/* Top nav */}
      <BlurFade delay={0} duration={0.6}>
        <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
          <div className="flex items-center gap-2.5">
            <MolinkLogo size={24} variant="pure" />
            <span className="text-base font-semibold text-foreground tracking-tight">
              Molink
            </span>
          </div>
          <button
            onClick={onLogin}
            className="h-9 px-4 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground rounded-lg transition-all duration-200"
          >
            登录
          </button>
        </header>
      </BlurFade>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-6xl mx-auto px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: copy */}
          <div className="flex flex-col items-start">
            <BlurFade delay={0.1} duration={0.6}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border mb-8">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  模块化编辑器，连接你的思维
                </span>
              </div>
            </BlurFade>

            <TextAnimate
              as="h1"
              by="character"
              animation="blurInUp"
              duration={0.8}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-tight"
            >
              你的 AI 工作空间
            </TextAnimate>

            <BlurFade delay={0.4} duration={0.6}>
              <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-md">
                用模块化编辑器连接你的想法，让知识自然生长。
              </p>
            </BlurFade>

            <BlurFade delay={0.6} duration={0.6}>
              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={onEnterWorkspace}
                  className="h-11 px-6 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200"
                >
                  开始使用
                </button>
                <button
                  onClick={onLogin}
                  className="h-11 px-6 text-sm font-medium text-secondary-foreground hover:text-foreground border border-border hover:border-muted-foreground rounded-lg transition-all duration-200"
                >
                  登录
                </button>
              </div>
            </BlurFade>

            <BlurFade delay={0.8} duration={0.6}>
              <p className="mt-5 text-xs text-muted-foreground/60">
                无需注册，即刻体验。
              </p>
            </BlurFade>
          </div>

          {/* Right: globe */}
          <div
            className="relative hidden lg:flex items-center justify-center"
            style={{ height: 480, width: 480 }}
          >
            <Globe
              className="!max-w-[480px] !aspect-square"
              config={BRAND_GLOBE_CONFIG}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <BlurFade delay={1} duration={0.6}>
        <footer className="relative z-10 px-6 sm:px-10 py-5 text-center text-xs text-muted-foreground/40">
          © 2025 Molink. 连接你的知识。
        </footer>
      </BlurFade>
    </div>
  );
}
