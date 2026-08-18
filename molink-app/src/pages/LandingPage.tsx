import { useEffect, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import { MolinkLogo } from "../components/MolinkLogo";
import {
  Github,
  Twitter,
  Type,
  FolderTree,
  Users,
  Database,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface LandingPageProps {
  onEnterWorkspace: () => void;
  onLogin: () => void;
}

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  desc: string;
  wide?: boolean;
  badge?: string;
}

/* 现代科技风落地页 · Vercel 路线（常驻暗色，不随应用主题变化）
   设计要点：纯黑底 + Inter 字体 + 白雾光效 + 极低对比细线 + 克制动效
   宪法约束：光效/边框只用白灰透明度，禁用渐变文字与彩色装饰 */

// Linear 同款缓动
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// 入场动效：位移 + 轻微缩放
const fadeUp = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

// IntersectionObserver 不可用时降级为默认可见（动画仅作增强，不 gate 内容可见性）
const ioSupported =
  typeof window !== "undefined" && "IntersectionObserver" in window;

function Navbar({ onLogin, onEnterWorkspace }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-dropdown transition-all duration-150 ${
        scrolled ? "bg-ld-bg/70 backdrop-blur-xl border-b border-ld-border" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-2.5">
          <MolinkLogo size={24} className="text-ld-fg" />
          <span className="text-base font-semibold text-ld-fg">Molink</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onLogin}
            className="h-9 px-4 text-sm font-medium text-ld-muted hover:text-ld-fg rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            登录
          </button>
          <button
            onClick={onEnterWorkspace}
            className="h-9 px-4 text-sm font-medium bg-ld-fg text-ld-bg rounded-lg transition-all duration-150 hover:-translate-y-px hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            开始使用
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ onLogin, onEnterWorkspace }: LandingPageProps) {
  return (
    <section className="relative pt-32 pb-24 overflow-hidden">
      {/* 网格背景（32px 密网格，顶部径向渐隐） */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--ld-border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--ld-border)/0.35)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_0%,black,transparent)]" />
      {/* 顶部主光晕（白雾，monochrome 宪法：光效不用彩色） */}
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[840px] h-[420px] rounded-full bg-white/[0.07] blur-[120px]" />

      {/* 文本块收窄到 8 栅格（max-w-3xl），外层容器全站统一 max-w-6xl */}
      <div className="relative max-w-3xl mx-auto text-center px-6">
        <motion.div {...fadeUp} transition={{ duration: 0.5, ease: EASE }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-ld-border bg-ld-card/60 px-3.5 py-1.5 text-xs text-ld-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            开源 · 自托管 · 协作规划中
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
          className="mt-8 text-5xl md:text-7xl font-bold text-ld-fg [text-wrap:balance]"
        >
          你的{" "}
          <span className="font-extrabold">模块化工作空间</span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.16, ease: EASE }}
          className="mt-6 text-base md:text-lg text-ld-muted max-w-xl mx-auto leading-relaxed [text-wrap:pretty]"
        >
          块级编辑器、无限层级页面树、实时协作规划中——
          模块化编辑器，连接你的思维，让知识自然生长。
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.24, ease: EASE }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <button
            onClick={onEnterWorkspace}
            className="group inline-flex items-center gap-2 h-11 px-6 text-sm font-medium bg-ld-fg text-ld-bg rounded-lg transition-all duration-150 hover:-translate-y-px hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            免费开始使用
            <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={onLogin}
            className="h-11 px-6 text-sm font-medium text-ld-muted hover:text-ld-fg border border-ld-border hover:border-ld-muted rounded-lg transition-all duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            登录
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function Showcase() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 pb-32">
      <motion.div
        initial={ioSupported ? { opacity: 0, y: 48 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative"
      >
        {/* 截图背后辉光（白雾，不用彩色光效） */}
        <div className="absolute -inset-x-10 -top-10 bottom-0 bg-gradient-to-b from-white/10 via-white/5 to-transparent blur-3xl" />
        <div className="relative rounded-xl border border-ld-border bg-ld-card/70 p-1.5 shadow-2xl">
          <img
            src="/landingpage.png"
            alt="Molink 编辑器界面"
            className="w-full rounded-lg"
            draggable={false}
          />
        </div>
      </motion.div>
    </section>
  );
}

const features: FeatureItem[] = [
  {
    icon: Type,
    title: "块级编辑器",
    desc: "一切内容皆块，自由拖拽编排。输入 / 唤起命令菜单，Markdown 快捷输入让双手不离键盘。",
    wide: true,
  },
  {
    icon: FolderTree,
    title: "页面树与回收站",
    desc: "无限层级组织，封面与图标个性装扮，误删一键还原整棵子树。",
  },
  {
    icon: Users,
    title: "实时协作",
    desc: "多人协作正在开发中：块级数据模型已就绪，在线协同编辑与成员光标即将上线。",
    badge: "规划中",
  },
  {
    icon: Database,
    title: "数据库多视图",
    desc: "表格、看板、日历多视图切换，结构化与自由写作共存。",
    wide: true,
  },
];

function Features() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 pb-40">
      <motion.div
        {...fadeUp}
        initial={ioSupported ? fadeUp.initial : false}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
        className="text-center mb-14"
      >
        <p className="text-xs font-semibold text-ld-muted mb-3">
          为什么选择 Molink
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-ld-fg [text-wrap:balance]">
          为专注写作而生
        </h2>
        <p className="mt-4 text-sm md:text-base text-ld-muted max-w-xl mx-auto [text-wrap:pretty]">
          没有繁杂的表单和面板，只有一张干净的纸，和刚好够用的工具。
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, desc, wide, badge }) => (
          <motion.div
            key={title}
            initial={ioSupported ? { opacity: 0, y: 24 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className={`group rounded-xl border border-ld-border bg-ld-card/40 p-6 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.02] ${
              wide ? "md:col-span-2" : ""
            }`}
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.08] text-ld-fg mb-5">
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <h3 className="text-base font-semibold text-ld-fg mb-2">
              {title}
              {badge && (
                <span className="ml-2 align-middle inline-flex items-center rounded-full border border-ld-border px-2 py-0.5 text-caption font-normal text-ld-muted">
                  {badge}
                </span>
              )}
            </h3>
            <p className="text-sm leading-relaxed text-ld-muted [text-wrap:pretty]">{desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Footer({ onLogin, onEnterWorkspace }: LandingPageProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-ld-border">
      {/* 多列分组：品牌 / 产品 / 资源 */}
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <MolinkLogo size={20} className="text-ld-fg" />
            <span className="text-sm font-semibold text-ld-fg">Molink</span>
          </div>
          <p className="mt-3 text-sm text-ld-muted max-w-xs [text-wrap:pretty]">
            模块化工作空间，让知识自然生长。
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-ld-muted mb-3">产品</p>
          <ul className="space-y-2.5 text-sm">
            <li>
              <button
                onClick={onEnterWorkspace}
                className="text-ld-muted hover:text-ld-fg transition-colors duration-150"
              >
                开始使用
              </button>
            </li>
            <li>
              <button
                onClick={onLogin}
                className="text-ld-muted hover:text-ld-fg transition-colors duration-150"
              >
                登录
              </button>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-ld-muted mb-3">资源</p>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a
                href="https://github.com"
                target="_blank"
                rel="nofollow noopener"
                className="inline-flex items-center gap-1.5 text-ld-muted hover:text-ld-fg transition-colors duration-150"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="nofollow noopener"
                className="inline-flex items-center gap-1.5 text-ld-muted hover:text-ld-fg transition-colors duration-150"
              >
                <Twitter className="w-4 h-4" />
                X
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ld-border">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-ld-muted">
          © {currentYear} Molink. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage({ onEnterWorkspace, onLogin }: LandingPageProps) {
  return (
    // reducedMotion="user"：尊重系统"减弱动态效果"设置
    <MotionConfig reducedMotion="user">
      <div className="landing relative w-full min-h-screen bg-ld-bg text-ld-fg antialiased">
        <Navbar onLogin={onLogin} onEnterWorkspace={onEnterWorkspace} />
        <Hero onLogin={onLogin} onEnterWorkspace={onEnterWorkspace} />
        <Showcase />
        <Features />
        <Footer onLogin={onLogin} onEnterWorkspace={onEnterWorkspace} />
      </div>
    </MotionConfig>
  );
}
