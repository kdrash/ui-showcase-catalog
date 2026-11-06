import { useRef, type PointerEvent, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ArrowUpRight, Play, Sparkles } from 'lucide-react'

/**
 * カーソルに吸い寄せられるボタン。
 * 外側の div を大きめのヒット領域にして、中心からの距離 × strength だけ移動させる。
 * 中のラベルはさらに 0.5 倍動かして奥行き(パララックス)を出す。
 */
function Magnetic({
  children,
  strength = 0.45,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const spring = { stiffness: 180, damping: 14, mass: 0.25 }
  const sx = useSpring(x, spring)
  const sy = useSpring(y, spring)
  const innerX = useTransform(sx, (v) => v * 0.5)
  const innerY = useTransform(sy, (v) => v * 0.5)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className="p-5">
      <motion.button
        style={{ x: sx, y: sy }}
        whileTap={{ scale: 0.92 }}
        className={className}
      >
        <motion.span style={{ x: innerX, y: innerY }} className="flex items-center justify-center gap-2">
          {children}
        </motion.span>
      </motion.button>
    </div>
  )
}

export function MagneticButtons() {
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#27272a,#09090b_70%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="relative flex flex-col items-center">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-zinc-500">move your cursor close</p>
        <div className="flex flex-wrap items-center justify-center">
          <Magnetic className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-[0_0_40px_rgba(255,255,255,.15)]">
            Get started <ArrowUpRight size={16} />
          </Magnetic>
          <Magnetic
            strength={0.6}
            className="grid size-16 place-items-center rounded-full border border-white/15 bg-white/5 backdrop-blur"
          >
            <Play size={20} className="translate-x-0.5" fill="currentColor" />
          </Magnetic>
          <Magnetic className="rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 text-sm font-semibold shadow-[0_8px_30px_rgba(168,85,247,.45)]">
            <Sparkles size={16} /> Magic
          </Magnetic>
        </div>
      </div>
    </div>
  )
}
