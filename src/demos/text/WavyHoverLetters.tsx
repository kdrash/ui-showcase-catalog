import { useRef, type PointerEvent } from 'react'
import { motion } from 'motion/react'

const HOVER = 'HOVER ME'
const PROXIMITY = 'Variable'
const WAVE = 'ゆらゆら WAVE ~'

/**
 * 1) whileHover で文字ごとにスプリング
 * 2) Variable Proximity: カーソルとの距離で可変フォント(Inter 300–800)の太さを変える。
 *    再レンダーを避けるため ref で直接 style を書き換える
 * 3) delay をずらした y キーフレームで波打つ
 */
export function WavyHoverLetters() {
  const letters = useRef<(HTMLSpanElement | null)[]>([])

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    for (const el of letters.current) {
      if (!el) continue
      const r = el.getBoundingClientRect()
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2))
      const t = Math.max(0, 1 - d / 150)
      el.style.fontWeight = String(Math.round(300 + t * 500))
      el.style.color = t > 0.02 ? `color-mix(in oklab, #ef4444 ${Math.round(t * 100)}%, #18181b)` : ''
    }
  }
  const onLeave = () =>
    letters.current.forEach((el) => {
      if (!el) return
      el.style.fontWeight = ''
      el.style.color = ''
    })

  return (
    <div className="@container relative flex h-full w-full flex-col justify-center gap-4 overflow-hidden bg-white px-6 text-zinc-900">
      <div className="pointer-events-none absolute inset-y-0 left-[22%] w-px bg-zinc-100" />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-zinc-100" />

      <div className="relative">
        <p className="mb-1 font-mono text-[9px] text-red-500">01 — Spring hover</p>
        <h3 className="flex text-[clamp(30px,9cqw,56px)] font-black leading-none tracking-tight">
          {Array.from(HOVER).map((c, i) => (
            <motion.span
              key={i}
              className="inline-block cursor-default"
              whileHover={{ y: -14, scale: 1.18, rotate: i % 2 ? -8 : 8, color: '#ef4444' }}
              transition={{ type: 'spring', stiffness: 500, damping: 12 }}
            >
              {c === ' ' ? ' ' : c}
            </motion.span>
          ))}
        </h3>
      </div>

      <div className="relative" onPointerMove={onMove} onPointerLeave={onLeave}>
        <p className="mb-1 font-mono text-[9px] text-red-500">02 — Variable proximity</p>
        <h3
          className="text-[clamp(34px,10cqw,64px)] font-light leading-none tracking-tight"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {Array.from(PROXIMITY).map((c, i) => (
            <span
              key={i}
              ref={(el) => {
                letters.current[i] = el
              }}
              className="inline-block transition-[font-weight,color] duration-150"
            >
              {c}
            </span>
          ))}
        </h3>
      </div>

      <div className="relative">
        <p className="mb-1 font-mono text-[9px] text-red-500">03 — Wave loop</p>
        <h3 className="flex text-[clamp(20px,5.5cqw,32px)] font-bold">
          {Array.from(WAVE).map((c, i) => (
            <motion.span
              key={i}
              className="inline-block"
              animate={{ y: [0, -9, 0] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
            >
              {c === ' ' ? ' ' : c}
            </motion.span>
          ))}
        </h3>
      </div>
    </div>
  )
}
