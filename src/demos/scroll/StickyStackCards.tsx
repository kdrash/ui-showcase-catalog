import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useRef } from 'react'
import { art } from '../_shared/art'

/**
 * position: sticky で積み重なるカード。
 * Motion の useScroll({ container, target }) でスタック区間の進捗を取り、
 * 先に積まれたカードほど useTransform で縮小・暗くなって奥に沈んでいく。
 */

const CARDS = [
  { no: '01', title: 'Research', jp: '課題を深く知る', color: '#f97316', seed: 3 },
  { no: '02', title: 'Design', jp: '体験を形にする', color: '#8b5cf6', seed: 5 },
  { no: '03', title: 'Build', jp: '堅牢に実装する', color: '#06b6d4', seed: 1 },
  { no: '04', title: 'Launch', jp: '世界に届ける', color: '#22c55e', seed: 2 },
]

function Card({ i, progress, total }: { i: number; progress: MotionValue<number>; total: number }) {
  const c = CARDS[i]
  const start = i / total
  const scale = useTransform(progress, [start, 1], [1, 1 - (total - i) * 0.06])
  const dim = useTransform(progress, [start, 1], [0, (total - 1 - i) * 0.18])
  return (
    <div className="sticky top-0 flex h-[100cqh] items-center justify-center px-5">
      <motion.article
        style={{ scale, top: i * 16, transformOrigin: 'top center' }}
        className="relative flex h-[min(78cqh,340px)] w-full max-w-xl overflow-hidden rounded-3xl text-white shadow-2xl shadow-black/40"
      >
        <div className="absolute inset-0" style={{ background: c.color }} />
        <div className="relative z-10 flex w-1/2 flex-col justify-between p-6">
          <span className="font-mono text-xs opacity-80">{c.no} / 0{total}</span>
          <div>
            <h3 className="font-['Space_Grotesk'] text-[clamp(26px,6cqw,44px)] leading-none font-bold">{c.title}</h3>
            <p className="mt-2 text-sm opacity-90">{c.jp}</p>
          </div>
        </div>
        <div className="relative w-1/2 overflow-hidden">
          <img src={art('landscape', c.seed, 600, 600)} alt="" className="h-full w-full object-cover" />
        </div>
        <motion.div style={{ opacity: dim }} className="pointer-events-none absolute inset-0 z-20 bg-black" />
      </motion.article>
    </div>
  )
}

export function StickyStackCards() {
  const scroller = useRef<HTMLDivElement>(null)
  const stack = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: scroller, target: stack, offset: ['start start', 'end end'] })
  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 text-white">
      <div ref={scroller} className="thin-scroll absolute inset-0 overflow-y-auto [container-type:size]">
        <header className="flex h-[70cqh] flex-col items-center justify-center text-center">
          <p className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">OUR PROCESS</p>
          <h2 className="mt-2 font-['Space_Grotesk'] text-[clamp(28px,6cqw,52px)] font-bold">4 steps, stacked.</h2>
          <p className="mt-3 animate-bounce text-xs text-zinc-500">↓ スクロール</p>
        </header>
        <div ref={stack} className="relative">
          {CARDS.map((_, i) => (
            <Card key={i} i={i} progress={scrollYProgress} total={CARDS.length} />
          ))}
        </div>
        <footer className="flex h-[60cqh] items-center justify-center font-['Space_Grotesk'] text-2xl font-bold text-zinc-600">
          Let's work together →
        </footer>
      </div>
    </div>
  )
}
