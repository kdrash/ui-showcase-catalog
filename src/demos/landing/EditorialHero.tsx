import { useState, type ReactNode } from 'react'
import { motion, type Variants } from 'motion/react'
import { ArrowUpRight, RotateCcw } from 'lucide-react'
import { art } from '../_shared/art'

const IMG_A = art('landscape', 3, 600, 300)
const IMG_B = art('geometric', 5, 400, 400)
const IMG_C = art('gradient', 6, 400, 500)

const word: Variants = {
  hidden: { y: '110%' },
  show: (i: number) => ({ y: '0%', transition: { delay: 0.15 + i * 0.09, duration: 0.9, ease: [0.22, 1, 0.36, 1] } }),
}
const pic: Variants = {
  hidden: { scale: 0, rotate: -12 },
  show: (i: number) => ({ scale: 1, rotate: 0, transition: { delay: 0.5 + i * 0.12, type: 'spring', stiffness: 160, damping: 16 } }),
}

/** マスクの中から下→上に出てくる1語 */
function W({ children, i, className = '' }: { children: ReactNode; i: number; className?: string }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
      <motion.span custom={i} variants={word} className={`inline-block ${className}`}>
        {children}
      </motion.span>
    </span>
  )
}

function Pic({ src, i, className }: { src: string; i: number; className: string }) {
  return (
    <motion.span
      custom={i}
      variants={pic}
      className={`mx-[0.12em] inline-block h-[0.78em] overflow-hidden align-[-0.02em] ${className}`}
      style={{ backgroundImage: `url("${src}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    />
  )
}

const TICKER = ['春夏コレクション 2026', '手仕事の器', '国産リネン', '職人インタビュー', '直営店オープン — 京都・三条', '送料無料キャンペーン']

export function EditorialHero() {
  const [run, setRun] = useState(0)
  return (
    <div className="@container relative flex h-full w-full flex-col overflow-hidden bg-[#f3efe6] text-[#16130f]">
      <style>{`@keyframes ed-ticker{to{transform:translateX(-50%)}}`}</style>
      {/* ナビ */}
      <header className="flex items-center justify-between border-b border-black/15 px-5 py-3 text-[11px] tracking-wider uppercase">
        <span className="font-[Playfair_Display] text-base font-bold tracking-normal normal-case italic">Atelier Nº7</span>
        <nav className="hidden gap-6 @xl:flex">
          <span>Journal</span>
          <span>Objects</span>
          <span>Makers</span>
          <span>Stores</span>
        </nav>
        <button
          onClick={() => setRun((r) => r + 1)}
          className="inline-flex items-center gap-1 rounded-full border border-black/30 px-2.5 py-1 normal-case hover:bg-black hover:text-[#f3efe6]"
        >
          <RotateCcw size={11} /> replay
        </button>
      </header>

      <motion.main
        key={run}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col justify-center px-5 leading-[0.92] font-[Inter] tracking-[-0.04em]"
      >
        <div className="text-[clamp(40px,9.6cqw,130px)] font-black uppercase">
          <W i={0}>Made</W>
          <Pic src={IMG_A} i={0} className="w-[1.9em] rounded-full" />
          <W i={1}>Slowly,</W>
        </div>
        <div className="text-[clamp(40px,9.6cqw,130px)]">
          <Pic src={IMG_B} i={1} className="w-[0.78em] rounded-full" />
          <W i={2} className="font-[Playfair_Display] font-normal tracking-[-0.02em] italic">kept</W>{' '}
          <W i={3} className="font-black uppercase">
            Long<span className="text-[#d6361f]">.</span>
          </W>
          <Pic src={IMG_C} i={2} className="hidden w-[0.62em] rounded-t-full @2xl:inline-block" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-5 flex flex-wrap items-end justify-between gap-4 font-['Noto_Sans_JP'] tracking-normal"
        >
          <p className="max-w-sm text-[13px] leading-relaxed text-black/70">
            ゆっくり作る、長く使う。全国42の工房と、毎日の暮らしに馴染む道具をつくっています。
          </p>
          <button className="group inline-flex items-center gap-2 rounded-full bg-[#16130f] px-5 py-2.5 text-sm text-[#f3efe6] transition hover:bg-[#d6361f]">
            コレクションを見る
            <ArrowUpRight size={15} className="transition group-hover:rotate-45" />
          </button>
        </motion.div>
      </motion.main>

      {/* マーキーティッカー */}
      <div className="overflow-hidden border-t border-black/80 bg-[#16130f] py-2 text-[#f3efe6]">
        <div className="flex w-max animate-[ed-ticker_30s_linear_infinite] text-xs tracking-wider">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-6 pr-6 whitespace-nowrap">
              {t} <span className="text-[#d6361f]">✺</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
