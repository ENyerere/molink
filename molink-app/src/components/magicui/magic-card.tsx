import React, { useCallback, useEffect, useMemo, useRef } from "react"
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react"
import { cn } from "../../lib/utils"

interface MagicCardBaseProps {
  children?: React.ReactNode
  className?: string
  gradientSize?: number
  gradientFrom?: string
  gradientTo?: string
}

interface MagicCardGradientProps extends MagicCardBaseProps {
  mode?: "gradient"

  gradientColor?: string
  gradientOpacity?: number

  glowFrom?: never
  glowTo?: never
  glowAngle?: never
  glowSize?: never
  glowBlur?: never
  glowOpacity?: never
}

interface MagicCardOrbProps extends MagicCardBaseProps {
  mode: "orb"

  glowFrom?: string
  glowTo?: string
  glowAngle?: number
  glowSize?: number
  glowBlur?: number
  glowOpacity?: number

  gradientColor?: never
  gradientOpacity?: never
}

type MagicCardProps = MagicCardGradientProps | MagicCardOrbProps
type ResetReason = "enter" | "leave" | "global" | "init"

function isOrbMode(props: MagicCardProps): props is MagicCardOrbProps {
  return props.mode === "orb"
}

// 色彩宪法：光效禁彩色，默认全部走前景色的灰阶透明度；
// 光效收敛：仅 hover 时出现，非 hover 态为静态细边 + 纯色卡片
export function MagicCard(props: MagicCardProps) {
  const {
    children,
    className,
    gradientSize = 200,
    gradientColor = "hsl(var(--foreground) / 0.06)",
    gradientOpacity = 0.8,
    gradientFrom = "hsl(var(--foreground) / 0.35)",
    gradientTo = "hsl(var(--foreground) / 0)",
    mode = "gradient",
  } = props

  const glowFrom = isOrbMode(props) ? (props.glowFrom ?? "hsl(var(--foreground) / 0.25)") : "hsl(var(--foreground) / 0.25)"
  const glowTo = isOrbMode(props) ? (props.glowTo ?? "hsl(var(--foreground) / 0.05)") : "hsl(var(--foreground) / 0.05)"
  const glowAngle = isOrbMode(props) ? (props.glowAngle ?? 90) : 90
  const glowSize = isOrbMode(props) ? (props.glowSize ?? 420) : 420
  const glowBlur = isOrbMode(props) ? (props.glowBlur ?? 60) : 60
  const glowOpacity = isOrbMode(props) ? (props.glowOpacity ?? 0.9) : 0.9
  const isDarkTheme = useMemo(() => {
    if (typeof window === "undefined") return true
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }, [])

  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)

  const orbX = useSpring(mouseX, { stiffness: 250, damping: 30, mass: 0.6 })
  const orbY = useSpring(mouseY, { stiffness: 250, damping: 30, mass: 0.6 })
  const orbVisible = useSpring(0, { stiffness: 300, damping: 35 })

  const modeRef = useRef(mode)
  const glowOpacityRef = useRef(glowOpacity)
  const gradientSizeRef = useRef(gradientSize)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    glowOpacityRef.current = glowOpacity
  }, [glowOpacity])

  useEffect(() => {
    gradientSizeRef.current = gradientSize
  }, [gradientSize])

  const reset = useCallback(
    (reason: ResetReason = "leave") => {
      const currentMode = modeRef.current

      if (currentMode === "orb") {
        if (reason === "enter") orbVisible.set(glowOpacityRef.current)
        else orbVisible.set(0)
        return
      }

      const off = -gradientSizeRef.current
      mouseX.set(off)
      mouseY.set(off)
    },
    [mouseX, mouseY, orbVisible]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    },
    [mouseX, mouseY]
  )

  useEffect(() => {
    reset("init")
  }, [reset])

  useEffect(() => {
    const handleGlobalPointerOut = (e: PointerEvent) => {
      if (!e.relatedTarget) reset("global")
    }
    const handleBlur = () => reset("global")
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") reset("global")
    }

    window.addEventListener("pointerout", handleGlobalPointerOut)
    window.addEventListener("blur", handleBlur)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("pointerout", handleGlobalPointerOut)
      window.removeEventListener("blur", handleBlur)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [reset])

  // 模板无条件创建，避免在 JSX 条件分支里调用 Hook
  const borderSpotlight = useMotionTemplate`
    linear-gradient(transparent 0 0) padding-box,
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientFrom},
      ${gradientTo},
      transparent 100%
    ) border-box
  `
  const innerGlow = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientColor},
      transparent 100%
    )
  `

  return (
    <motion.div
      className={cn(
        "group relative isolate overflow-hidden border border-border",
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => reset("leave")}
      onPointerEnter={() => reset("enter")}
    >
      {/* 卡片底色（非 hover 态的静态表面） */}
      <div className="bg-card absolute inset-0 z-20 rounded-[inherit]" />

      {/* 鼠标聚光边框：仅 hover 时出现，monochrome 灰阶 */}
      <motion.div
        suppressHydrationWarning
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] border border-transparent opacity-0 transition-opacity duration-[220ms] group-hover:opacity-100"
        style={{ background: borderSpotlight }}
      />

      {mode === "gradient" && (
        <motion.div
          suppressHydrationWarning
          aria-hidden="true"
          className="pointer-events-none absolute inset-px z-30 rounded-[inherit] opacity-0 transition-opacity duration-[220ms] group-hover:opacity-[var(--glow-opacity)]"
          style={{
            background: innerGlow,
            // hover 目标不透明度通过 CSS 变量传给 group-hover 类
            ...({ "--glow-opacity": gradientOpacity } as React.CSSProperties),
          }}
        />
      )}

      {mode === "orb" && (
        <motion.div
          suppressHydrationWarning
          aria-hidden="true"
          className="pointer-events-none absolute z-30"
          style={{
            width: glowSize,
            height: glowSize,
            x: orbX,
            y: orbY,
            translateX: "-50%",
            translateY: "-50%",
            borderRadius: 9999,
            filter: `blur(${glowBlur}px)`,
            opacity: orbVisible,
            background: `linear-gradient(${glowAngle}deg, ${glowFrom}, ${glowTo})`,

            mixBlendMode: isDarkTheme ? "screen" : "multiply",
            willChange: "transform, opacity",
          }}
        />
      )}
      <div className="relative z-40">{children}</div>
    </motion.div>
  )
}
