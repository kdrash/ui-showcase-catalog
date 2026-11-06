import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity, type MotionValue } from 'motion/react'
import { useRef } from 'react'

/**
 * スクロール速度に反応するマーキー(Motion)。
 * useScroll → useVelocity → useSpring でなめらかな速度を作り、
 *  - useAnimationFrame で毎フレーム x を進める(速度が大きいほど速く、逆スクロールで向きも反転)
 *  - 同じ速度を useTransform で skewX に変換して“しなる”見た目に
 */

const wrap = (min: number, max: number, v: number) => {
  const r = max - min
  return ((((v - min) % r) + r) % r) + min
}

function Row({ text, base, velocity, className }: { text: string; base: number; velocity: MotionValue<number>; className: string }) {
  const x = useMotionValue(0)
  const factor = useTransform(velocity, [-1500, 0, 1500], [-6, 0, 6], { clamp: false })
  const skewX = useTransform(velocity, [-1500, 1500], [12, -12])
  const dir = useRef(1)
  const pos = useRef(0)
  useAnimationFrame((_, delta) => {
    const f = factor.get()
    if (f < 0) dir.current = -1
    else if (f > 0) dir.current = 1
    pos.current += dir.current * base * (delta / 1000) * (1 + Math.abs(f))
    x.set(wrap(-25, 0, pos.current))
  })
  const xp = useTransform(x, (v) => `${v}%`)
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <motion.div style={{ x: xp, skewX }} className={`flex w-max ${className}`}>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="pr-[0.4em]">
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

export function ScrollVelocityMarquee() {
  const scroller = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: scroller })
  const raw = useVelocity(scrollY)
  const velocity = useSpring(raw, { damping: 50, stiffness: 400 })
  const meter = useTransform(velocity, (v) => `${Math.min(100, Math.abs(v) / 25)}%`)
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e8ff47] text-zinc-950">
      <div ref={scroller} className="thin-scroll absolute inset-0 overflow-y-auto [container-type:size]">
        <div className="relative h-[600cqh]">
          <div className="sticky top-0 flex h-[100cqh] flex-col justify-center gap-1 font-['Space_Grotesk'] leading-[0.95] font-bold tracking-tighter uppercase">
            <Row text="Scroll faster ✦" base={-4} velocity={velocity} className="text-[clamp(44px,13cqw,110px)]" />
            <Row text="速度で変わる ✦" base={3} velocity={velocity} className="text-[clamp(40px,11cqw,96px)] text-transparent [-webkit-text-stroke:2px_#09090b]" />
            <Row text="Velocity marquee ✦" base={-2.5} velocity={velocity} className="text-[clamp(44px,13cqw,110px)]" />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-zinc-950 px-3 py-1.5 text-[11px] text-[#e8ff47]">
        ↓ スクロール
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/20">
          <motion.div style={{ width: meter }} className="h-full bg-[#e8ff47]" />
        </div>
      </div>
    </div>
  )
}
