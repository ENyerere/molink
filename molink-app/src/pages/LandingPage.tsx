import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MolinkLogo } from "../components/MolinkLogo";
import {
  Github,
  Twitter,
  Type,
  FolderTree,
  Users,
  Database,
  ArrowRight,
} from "lucide-react";

interface LandingPageProps {
  onEnterWorkspace: () => void;
  onLogin: () => void;
}

/* 现代科技风落地页（常驻暗色，不随应用主题变化）
   设计要点：深青黑底 + 顶部网格与光晕 + 渐变标题 + 玻璃质感卡片 */

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

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
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-150 ${
        scrolled ? "bg-ld-bg/70 backdrop-blur-xl border-b border-ld-border" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-2.5">
          <MolinkLogo size={24} variant="pure" />
          <span className="text-base font-semibold text-ld-fg tracking-tight">Molink</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onLogin}
            className="h-9 px-4 text-sm font-medium text-ld-muted hover:text-ld-fg rounded-lg transition-colors duration-150"
          >
            登录
          </button>
          <button
            onClick={onEnterWorkspace}
            className="h-9 px-4 text-sm font-medium bg-ld-fg text-ld-bg rounded-lg hover:opacity-90 transition-opacity duration-150"
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
    <section className="relative pt-44 pb-24 overflow-hidden">
      {/* 网格背景（顶部径向渐隐） */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--ld-border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--ld-border)/0.35)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_0%,black,transparent)]" />
      {/* 顶部主光晕 */}
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[840px] h-[420px] rounded-full bg-primary/20 blur-[120px]" />

      <div className="relative max-w-4xl mx-auto text-center px-6">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-ld-border bg-ld-card/60 backdrop-blur px-3.5 py-1.5 text-xs text-ld-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            开源 · 自托管 · 实时协作
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-8 text-5xl md:text-7xl font-bold tracking-tight text-ld-fg"
        >
          你的{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AI 工作空间
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-6 text-base md:text-lg text-ld-muted max-w-xl mx-auto leading-relaxed"
        >
          块级编辑器、无限层级页面树、WebSocket 实时协作——
          模块化编辑器，连接你的思维，让知识自然生长。
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <button
            onClick={onEnterWorkspace}
            className="group inline-flex items-center gap-2 h-11 px-6 text-sm font-medium bg-ld-fg text-ld-bg rounded-lg hover:opacity-90 transition-opacity duration-150"
          >
            免费开始使用
            <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={onLogin}
            className="h-11 px-6 text-sm font-medium text-ld-muted hover:text-ld-fg border border-ld-border hover:border-ld-muted rounded-lg transition-colors duration-150"
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
    <section className="relative max-w-5xl mx-auto px-6 pb-28">
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        {/* 截图背后辉光 */}
        <div className="absolute -inset-x-10 -top-10 bottom-0 bg-gradient-to-b from-primary/25 via-purple-500/10 to-transparent blur-3xl" />
        <div className="relative rounded-xl border border-ld-border bg-ld-card/70 backdrop-blur p-1.5 shadow-2xl">
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

const features = [
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
    desc: "WebSocket 多人在线编辑，成员光标与内容变更即时可见。",
  },
  {
    icon: Database,
    title: "数据库多视图",
    desc: "表格、看板、日历多视图切换，结构化与自由写作共存。",
  },
];

function Features() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 pb-28">
      <motion.div
        {...fadeUp}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ld-muted mb-3">
          为什么选择 Molink
        </p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-ld-fg">
          为专注写作而生
        </h2>
        <p className="mt-4 text-sm md:text-base text-ld-muted max-w-xl mx-auto">
          没有繁杂的表单和面板，只有一张干净的纸，和刚好够用的工具。
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, desc, wide }) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5 }}
            className={`group rounded-xl border border-ld-border bg-ld-card/40 backdrop-blur p-6 transition-colors duration-150 hover:border-primary/40 ${
              wide ? "md:col-span-2" : ""
            }`}
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/25 to-purple-500/25 text-primary mb-5">
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <h3 className="text-base font-semibold text-ld-fg mb-2">{title}</h3>
            <p className="text-sm leading-relaxed text-ld-muted">{desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-ld-border">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-sm text-ld-muted">
          <MolinkLogo size={20} variant="pure" />
          <span>© {currentYear} Molink. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="https://github.com"
            target="_blank"
            rel="nofollow noopener"
            aria-label="GitHub"
            className="text-ld-muted hover:text-ld-fg transition-colors duration-150"
          >
            <Github className="w-5 h-5" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="nofollow noopener"
            aria-label="X (formerly Twitter)"
            className="text-ld-muted hover:text-ld-fg transition-colors duration-150"
          >
            <Twitter className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage({ onEnterWorkspace, onLogin }: LandingPageProps) {
  return (
    <div className="landing relative w-full min-h-screen bg-ld-bg text-ld-fg antialiased">
      <Navbar onLogin={onLogin} onEnterWorkspace={onEnterWorkspace} />
      <Hero onLogin={onLogin} onEnterWorkspace={onEnterWorkspace} />
      <Showcase />
      <Features />
      <Footer />
    </div>
  );
}
