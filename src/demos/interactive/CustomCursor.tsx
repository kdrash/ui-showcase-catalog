import { useRef, useState, type PointerEvent } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

type Variant = 'default' | 'link' | 'view' | 'text'

const variants: Record<Variant, { width: number; height: number; borderRadius: number }> = {
  default: { width: 22, height: 22, borderRadius: 999 },
  link: { width: 64, height: 64, borderRadius: 999 },
  view: { width: 96, height: 96, borderRadius: 999 },
  text: { width: 4, height: 40, borderRadius: 2 },
}

/**
 * プレビュー内だけで動くカスタムカーソル。
 * data-cursor="link|view|text" を持つ要素の上で形が変わる。mix-blend-mode: difference で背景を反転。
 */
export function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(-100)
  const my = useMotionValue(-100)
  const sx = useSpring(mx, { stiffness: 380, damping: 30, mass: 0.5 })
  const sy = useSpring(my, { stiffness: 380, damping: 30, mass: 0.5 })
  const [variant, setVariant] = useState<Variant>('default')
  const [visible, setVisible] = useState(false)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = rootRef.current!.getBoundingClientRect()
    mx.set(e.clientX - r.left)
    my.set(e.clientY - r.top)
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor]')
    setVariant((el?.dataset.cursor as Variant | undefined) ?? 'default')
  }

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      onPointerEnter={() => setVisible(true)}
      onPointerLeave={() => setVisible(false)}
      className="relative h-full w-full cursor-none overflow-hidden bg-[#f3eee6] p-5 text-zinc-900 [&_*]:cursor-none"
    >
      <nav className="flex items-center justify-between text-xs">
        <span className="font-black tracking-tight">STUDIO®</span>
        <span className="flex gap-4">
          {['Work', 'About', 'Contact'].map((l) => (
            <a key={l} data-cursor="link" className="py-2 underline-offset-4 hover:underline">
              {l}
            </a>
          ))}
        </span>
      </nav>

      <div className="mt-4 grid grid-cols-[1.3fr_1fr] items-center gap-4">
        <div>
          <h3
            data-cursor="text"
            className="text-[clamp(28px,6cqw,46px)] leading-[0.95]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Creative <i>cursor</i>
            <br />
            experience
          </h3>
          <p data-cursor="text" className="mt-3 max-w-[260px] text-[11px] leading-relaxed text-zinc-600">
            リンクの上では拡大、作品カードの上では「VIEW」、テキストの上ではキャレット型に変化します。
          </p>
          <button
            data-cursor="link"
            className="mt-4 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white"
          >
            Let's talk →
          </button>
        </div>
        <div
          data-cursor="view"
          className="aspect-[4/5] max-h-[200px] rounded-2xl bg-[radial-gradient(circle_at_30%_30%,#fda4af,transparent_50%),radial-gradient(circle_at_70%_70%,#93c5fd,transparent_55%),linear-gradient(135deg,#fde68a,#c4b5fd)] p-3"
        >
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium">Project 01</span>
        </div>
      </div>

      {/* 追従する大きい円(スプリングで遅れて付いてくる) */}
      <motion.div
        className="pointer-events-none absolute left-0 top-0 z-50 grid place-items-center bg-white mix-blend-difference"
        style={{ x: sx, y: sy, translateX: '-50%', translateY: '-50%' }}
        animate={{ ...variants[variant], opacity: visible ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        {variant === 'view' && <span className="text-[11px] font-bold tracking-widest text-black">VIEW</span>}
      </motion.div>
      {/* 正確な位置を示す小さい点 */}
      <motion.div
        className="pointer-events-none absolute left-0 top-0 z-50 size-1.5 rounded-full bg-zinc-900"
        style={{ x: mx, y: my, translateX: '-50%', translateY: '-50%' }}
        animate={{ opacity: visible && variant === 'default' ? 1 : 0 }}
      />
    </div>
  )
}
