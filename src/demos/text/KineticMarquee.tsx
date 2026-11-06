import { useRef, type CSSProperties } from 'react'
import { motion, useAnimationFrame, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'

/** v を [min, max) の範囲に巻き戻す */
const wrap = (min: number, max: number, v: number) => {
  const r = max - min
  return ((((v - min) % r) + r) % r) + min
}

/** 同じテキストを2つ並べ、-50%〜0% の範囲でループさせるとシームレスに流れる */
function Row({
  text,
  speed,
  factor,
  className = '',
  textClass = '',
  textStyle,
}: {
  text: string
  speed: number
  factor: MotionValue<number>
  className?: string
  textClass?: string
  textStyle?: CSSProperties
}) {
  const base = useMotionValue(0)
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`)
  useAnimationFrame((_, delta) => {
    base.set(base.get() + speed * factor.get() * (delta / 1000))
  })
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div className="flex w-max" style={{ x }}>
        {[0, 1].map((k) => (
          <span key={k} className={`pr-[0.4em] ${textClass}`} style={textStyle} aria-hidden={k === 1}>
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

export function KineticMarquee() {
  const dir = useRef(1)
  const hovering = useRef(false)
  const target = useMotionValue(1)
  const factor = useSpring(target, { stiffness: 90, damping: 20 })
  const apply = () => target.set((hovering.current ? 4 : 1) * dir.current)

  return (
    <div
      onPointerEnter={() => {
        hovering.current = true
        apply()
      }}
      onPointerLeave={() => {
        hovering.current = false
        apply()
      }}
      onClick={() => {
        dir.current *= -1
        apply()
      }}
      className="@container relative flex h-full w-full cursor-pointer select-none flex-col justify-center gap-1 overflow-hidden bg-[#facc15] text-black"
      style={{ fontFamily: '"Space Grotesk", "Noto Sans JP", sans-serif' }}
    >
      <Row
        text="UI SHOWCASE ✦ デザイン ✦ MOTION ✦ タイポグラフィ ✦"
        speed={-5}
        factor={factor}
        textClass="text-[clamp(36px,11cqw,76px)] font-bold leading-none tracking-tight"
      />
      <Row
        text="KINETIC TYPE ★ 動くタイポ ★ KINETIC TYPE ★ 動くタイポ ★"
        speed={4}
        factor={factor}
        textClass="text-[clamp(36px,11cqw,76px)] font-bold leading-none tracking-tight text-transparent"
        textStyle={{ WebkitTextStroke: '2px #000' }}
      />
      <Row
        text="HOVER → FAST ✺ CLICK → REVERSE ✺ ホバーで加速 ✺ クリックで反転 ✺"
        speed={-7}
        factor={factor}
        className="my-2 -rotate-3 scale-110 border-y-4 border-black bg-black py-1.5"
        textClass="text-[clamp(18px,5cqw,30px)] font-bold uppercase tracking-wide text-[#facc15]"
      />
    </div>
  )
}
