import type { PointerEvent } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react'
import { Star } from 'lucide-react'

/**
 * Motion でポインタ位置(0〜1)を MotionValue に入れ、useSpring で滑らかにしてから
 * rotateX / rotateY とグレア(光の反射)位置に変換する 3D チルトカード。
 * 子要素を translateZ で浮かせて奥行き(パララックス)を出している。
 */
export function TiltCard() {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 180, damping: 18 })
  const sy = useSpring(my, { stiffness: 180, damping: 18 })

  const rotateX = useTransform(sy, [0, 1], [16, -16])
  const rotateY = useTransform(sx, [0, 1], [-16, 16])
  const gx = useTransform(sx, (v) => `${v * 100}%`)
  const gy = useTransform(sy, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.45), transparent 55%)`
  const shadowX = useTransform(sx, [0, 1], [24, -24])
  const shadowY = useTransform(sy, [0, 1], [30, 10])
  const shadow = useMotionTemplate`${shadowX}px ${shadowY}px 50px -12px rgba(124, 58, 237, 0.55)`

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
  }
  const onLeave = () => {
    mx.set(0.5)
    my.set(0.5)
  }

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,#2e1065,#09090b_70%)]">
      <div style={{ perspective: 900 }}>
        <motion.div
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          className="relative h-[270px] w-[200px] cursor-pointer rounded-3xl border border-white/15 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-400 p-5 text-white"
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d', boxShadow: shadow }}
        >
          <div style={{ transform: 'translateZ(30px)' }} className="flex items-center justify-between">
            <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest">
              New
            </span>
            <span className="flex items-center gap-0.5 text-xs">
              <Star size={12} fill="currentColor" /> 4.9
            </span>
          </div>
          <div
            style={{ transform: 'translateZ(80px)' }}
            className="my-3 text-center text-[84px] leading-none drop-shadow-[0_20px_20px_rgba(0,0,0,0.35)]"
          >
            👟
          </div>
          <div style={{ transform: 'translateZ(50px)' }}>
            <div className="text-xl font-black tracking-tight">AIR FLOW 3D</div>
            <div className="text-xs text-white/75">Limited Edition Runner</div>
          </div>
          <div style={{ transform: 'translateZ(40px)' }} className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold">¥24,800</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-700">Buy</span>
          </div>
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-3xl mix-blend-overlay"
            style={{ background: glare }}
          />
        </motion.div>
      </div>
    </div>
  )
}
