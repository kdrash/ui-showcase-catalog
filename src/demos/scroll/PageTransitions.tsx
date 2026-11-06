import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { art } from '../_shared/art'

/**
 * ミニアプリのページ遷移を4種類から選べるデモ(Motion)。
 *  - slide / circle : AnimatePresence で新旧ページを重ね、variants で x移動 / clip-path の円形リビール
 *  - curtain / stairs: 画面を覆うオーバーレイを keyframes で走らせ、覆った瞬間にページを差し替える
 */

type Page = 'home' | 'work' | 'about'
type Style = 'slide' | 'circle' | 'curtain' | 'stairs'
const PAGES: Page[] = ['home', 'work', 'about']
const STYLES: Style[] = ['slide', 'circle', 'curtain', 'stairs']
const COVER_MS = 520

const variants: Record<'slide' | 'circle', Variants> = {
  slide: {
    initial: { x: '100%', zIndex: 2 },
    animate: { x: '0%', zIndex: 2, transition: { duration: 0.6, ease: [0.7, 0, 0.2, 1] } },
    exit: { x: '-30%', opacity: 0.4, zIndex: 1, transition: { duration: 0.6, ease: [0.7, 0, 0.2, 1] } },
  },
  circle: {
    initial: { clipPath: 'circle(0% at 50% 50%)', zIndex: 2 },
    animate: { clipPath: 'circle(75% at 50% 50%)', zIndex: 2, transition: { duration: 0.7, ease: [0.65, 0, 0.35, 1] } },
    exit: { zIndex: 1, transition: { duration: 0.7 } },
  },
}

function PageBody({ page }: { page: Page }) {
  if (page === 'home')
    return (
      <div className="flex h-full items-center gap-6 bg-[#f5f0e8] px-8 text-zinc-900">
        <div className="flex-1">
          <p className="font-mono text-[11px] tracking-widest text-orange-600">STUDIO NAGI</p>
          <h2 className="mt-2 font-['Playfair_Display'] text-[clamp(28px,6cqw,54px)] leading-[0.95] font-bold">
            Quiet design,
            <br />
            <i>loud results.</i>
          </h2>
        </div>
        <img src={art('landscape', 3, 500, 600)} alt="" className="h-[70%] w-[34%] rounded-[40px_40px_200px_200px] object-cover" />
      </div>
    )
  if (page === 'work')
    return (
      <div className="h-full bg-[#111] p-6 text-white">
        <h2 className="font-['Space_Grotesk'] text-2xl font-bold">Selected work</h2>
        <div className="mt-4 grid h-[70%] grid-cols-3 gap-3">
          {[5, 6, 1].map((s, i) => (
            <div key={s} className="relative overflow-hidden rounded-xl">
              <img src={art(i === 1 ? 'geometric' : 'gradient', s, 400, 500)} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[11px]">Project 0{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    )
  return (
    <div className="flex h-full flex-col justify-center bg-indigo-600 px-8 text-white">
      <h2 className="font-['Space_Grotesk'] text-[clamp(26px,5cqw,44px)] font-bold">About us</h2>
      <p className="mt-2 max-w-md text-sm text-indigo-100">東京を拠点に、ブランドとプロダクトの体験をデザインする小さなスタジオです。</p>
      <div className="mt-5 flex gap-8">
        {[
          ['12', 'years'],
          ['140+', 'projects'],
          ['9', 'awards'],
        ].map(([n, l]) => (
          <div key={l}>
            <div className="font-['Space_Grotesk'] text-3xl font-bold">{n}</div>
            <div className="text-xs text-indigo-200">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageTransitions() {
  const [style, setStyle] = useState<Style>('slide')
  const [page, setPage] = useState<Page>('home')
  const [cover, setCover] = useState<{ n: number; style: Style } | null>(null) // オーバーレイ再生用
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const go = (p: Page) => {
    if (p === page) return
    if (style === 'curtain' || style === 'stairs') {
      setCover((c) => ({ n: (c?.n ?? 0) + 1, style }))
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setPage(p), COVER_MS)
    } else setPage(p)
  }
  const v = style === 'slide' || style === 'circle' ? variants[style] : undefined

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-900 [container-type:inline-size]">
      <nav className="relative z-30 flex items-center justify-between gap-2 border-b border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white">
        <div className="flex gap-1">
          {PAGES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              className={`rounded-full px-3 py-1 capitalize transition ${page === p ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 rounded-full bg-white/5 p-0.5">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              className={`rounded-full px-2.5 py-1 transition ${style === s ? 'bg-fuchsia-500 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </nav>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={page}
            variants={v}
            initial={v ? 'initial' : false}
            animate={v ? 'animate' : undefined}
            exit={v ? 'exit' : undefined}
            className="absolute inset-0"
          >
            <PageBody page={page} />
          </motion.div>
        </AnimatePresence>

        {/* curtain / stairs のオーバーレイ */}
        {cover?.style === 'curtain' && (
          <motion.div
            key={`c${cover.n}`}
            initial={{ y: '100%' }}
            animate={{ y: ['100%', '0%', '0%', '-100%'] }}
            transition={{ duration: 1.1, times: [0, 0.45, 0.55, 1], ease: [0.76, 0, 0.24, 1] }}
            className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-fuchsia-600 font-['Playfair_Display'] text-3xl text-white italic"
          >
            Nagi.
          </motion.div>
        )}
        {cover?.style === 'stairs' && (
          <div key={`s${cover.n}`} className="pointer-events-none absolute inset-0 z-20 flex">
            {Array.from({ length: 6 }, (_, i) => (
              <motion.div
                key={i}
                initial={{ y: '100%' }}
                animate={{ y: ['100%', '0%', '0%', '-100%'] }}
                transition={{ duration: 1.05, times: [0, 0.4, 0.6, 1], ease: [0.76, 0, 0.24, 1], delay: i * 0.04 }}
                className="h-full flex-1 bg-zinc-950"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
