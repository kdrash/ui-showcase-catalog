import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { art } from '../_shared/art'

const SECTIONS = [
  { id: 'feature', label: '特徴', title: '軽くて、速い。', seed: 0 },
  { id: 'design', label: 'デザイン', title: '手に馴染む曲線。', seed: 1 },
  { id: 'spec', label: 'スペック', title: '一日中もつバッテリー。', seed: 6 },
  { id: 'price', label: '価格', title: '¥39,800 から。', seed: 3 },
]

export function HideOnScrollHeader() {
  const scroller = useRef<HTMLDivElement>(null)
  const { scrollY, scrollYProgress } = useScroll({ container: scroller })
  const [hidden, setHidden] = useState(false)
  const [compact, setCompact] = useState(false)
  const [active, setActive] = useState('feature')

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(y > prev && y > 90)
    setCompact(y > 16)
    const el = scroller.current
    if (!el) return
    for (const s of [...SECTIONS].reverse()) {
      const sec = el.querySelector<HTMLElement>(`[data-sec="${s.id}"]`)
      if (sec && sec.offsetTop - 80 <= y) {
        setActive(s.id)
        break
      }
    }
  })

  return (
    <div className="relative h-full w-full overflow-hidden bg-white font-sans text-zinc-900">
      <motion.header
        animate={{ y: hidden ? '-110%' : '0%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 36 }}
        className={`absolute inset-x-0 top-0 z-10 flex items-center gap-4 px-5 transition-[padding,background-color,box-shadow] duration-300 ${
          compact ? 'bg-white/70 py-2 shadow-[0_1px_0_rgba(0,0,0,.08)] backdrop-blur-xl' : 'bg-transparent py-4'
        }`}
      >
        <span className={`font-bold tracking-tight transition-all ${compact ? 'text-sm' : 'text-lg'}`}>Aurum Pad</span>
        <nav className="ml-auto flex gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                const sec = scroller.current?.querySelector<HTMLElement>(`[data-sec="${s.id}"]`)
                scroller.current?.scrollTo({ top: (sec?.offsetTop ?? 0) - 40, behavior: 'smooth' })
              }}
              className={`relative px-2.5 py-1 text-xs transition ${active === s.id ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {s.label}
              {active === s.id && <motion.span layoutId="hos-underline" className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-zinc-900" />}
            </button>
          ))}
        </nav>
        <button className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white">購入</button>
        <motion.span style={{ scaleX: scrollYProgress }} className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-sky-500 to-violet-500" />
      </motion.header>

      <div ref={scroller} className="thin-scroll h-full overflow-y-auto">
        <div className="px-5 pt-20 pb-6">
          <div className="text-xs font-semibold tracking-widest text-violet-600 uppercase">New</div>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">下にスクロールすると、ヘッダーが隠れます。</h2>
          <p className="mt-2 text-sm text-zinc-500">上に戻すとすぐ現れ、少しでもスクロールすると縮んですりガラスになります。</p>
        </div>
        {SECTIONS.map((s) => (
          <section key={s.id} data-sec={s.id} className="px-5 py-6">
            <div className="text-xs text-zinc-400">{s.label}</div>
            <h3 className="mb-3 text-xl font-semibold">{s.title}</h3>
            <img src={art('landscape', s.seed, 900, 420)} alt="" className="h-44 w-full rounded-2xl object-cover" />
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              厚さ5.9mm、重さ440g。アルミニウムの一枚板から削り出したボディは、持ち歩くたびにその軽さに驚くはずです。
            </p>
          </section>
        ))}
        <div className="h-24" />
      </div>
    </div>
  )
}
