import { useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react'
import { useDrag } from '@use-gesture/react'
import { ArrowDown } from 'lucide-react'
import { PhoneFrame } from './PhoneFrame'

type Item = { id: number; emoji: string; title: string; src: string; time: string; fresh?: boolean }
const POOL: Omit<Item, 'id' | 'time'>[] = [
  { emoji: '🌸', title: '都内の桜、来週にも満開へ', src: 'ウェザー' },
  { emoji: '🚄', title: '新型車両が試運転を開始', src: 'トラベル' },
  { emoji: '🍙', title: 'コンビニおにぎり人気ランキング', src: 'グルメ' },
  { emoji: '💻', title: '新しいノートPCの実機レビュー', src: 'テック' },
  { emoji: '⚽', title: '代表メンバーが発表されました', src: 'スポーツ' },
  { emoji: '🎬', title: '今週末に公開される注目映画5選', src: 'カルチャー' },
  { emoji: '🧪', title: '新素材で電池寿命が2倍に', src: 'サイエンス' },
  { emoji: '🏯', title: '城下町で秋のライトアップ', src: 'おでかけ' },
]
let uid = 0
const take = (n: number, time: string, fresh = false) =>
  Array.from({ length: n }, () => ({ ...POOL[uid % POOL.length], id: ++uid, time, fresh }))

const THRESHOLD = 70
const R = 9
const C = 2 * Math.PI * R

export function PullToRefresh() {
  const [items, setItems] = useState<Item[]>(() => take(6, '1時間前'))
  const [state, setState] = useState<'idle' | 'ready' | 'refreshing'>('idle')
  const scroller = useRef<HTMLDivElement>(null)
  const y = useMotionValue(0)
  const pct = useTransform(y, [0, THRESHOLD], [0, 1], { clamp: true })
  const dash = useTransform(pct, (p) => C * (1 - p * 0.92))
  const arrowRot = useTransform(pct, [0.6, 1], [0, 180], { clamp: true })
  const spinnerOpacity = useTransform(y, [0, 24], [0, 1])

  useMotionValueEvent(y, 'change', (v) => {
    if (state === 'refreshing') return
    setState(v >= THRESHOLD ? 'ready' : 'idle')
  })

  const refresh = () => {
    setState('refreshing')
    animate(y, 56, { type: 'spring', stiffness: 400, damping: 35 })
    setTimeout(() => {
      setItems((xs) => [...take(2, 'たった今', true), ...xs.map((x) => ({ ...x, fresh: false }))].slice(0, 12))
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
      setState('idle')
    }, 1400)
  }

  const bind = useDrag(
    ({ movement: [, my], last, cancel, first, memo }) => {
      const atTop = first ? (scroller.current?.scrollTop ?? 0) <= 0 : memo
      if (!atTop || state === 'refreshing') return atTop
      if (my < 0 && !last) {
        y.set(0)
        return atTop
      }
      // 抵抗感: 引くほど重くなる
      const pulled = Math.max(0, my)
      y.set(Math.min(130, pulled * 0.55 - pulled * pulled * 0.0006))
      if (last) {
        if (y.get() >= THRESHOLD) refresh()
        else animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 })
      }
      if (pulled > 400) cancel()
      return atTop
    },
    { axis: 'y', filterTaps: true },
  )

  const label = state === 'refreshing' ? '更新中…' : state === 'ready' ? '指を離して更新' : '引っ張って更新'

  return (
    <PhoneFrame
      screenClass="bg-zinc-100"
      side={
        <div className="space-y-2">
          <div className="text-base font-bold text-zinc-900">プル・トゥ・リフレッシュ</div>
          <p>リストを下に引っ張ると、引いた量に応じてリングが満ちていきます。しきい値を超えて離すと更新。</p>
        </div>
      }
    >
      <div className="absolute inset-x-0 top-0 z-30 h-11 bg-zinc-100/90 backdrop-blur" />
      <div className="absolute inset-x-0 top-11 z-20 flex items-end justify-between bg-zinc-100/90 px-4 pb-2 backdrop-blur">
        <div className="text-[22px] font-bold tracking-tight text-zinc-900">ニュース</div>
        <div className="pb-1 text-[10px] text-zinc-400">最終更新 {items[0]?.time}</div>
      </div>
      {/* indicator */}
      <motion.div style={{ opacity: spinnerOpacity }} className="absolute inset-x-0 top-[92px] z-10 flex flex-col items-center gap-1 text-zinc-500">
        <div className="relative grid h-7 w-7 place-items-center">
          <motion.svg viewBox="0 0 24 24" className={`absolute inset-0 -rotate-90 ${state === 'refreshing' ? 'animate-spin' : ''}`}>
            <circle cx="12" cy="12" r={R} fill="none" stroke="#e4e4e7" strokeWidth="2.5" />
            <motion.circle
              cx="12" cy="12" r={R} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C}
              style={{ strokeDashoffset: state === 'refreshing' ? C * 0.7 : dash }}
            />
          </motion.svg>
          {state !== 'refreshing' && (
            <motion.span style={{ rotate: arrowRot }}>
              <ArrowDown size={12} className="text-indigo-500" />
            </motion.span>
          )}
        </div>
        <span className="text-[10px]">{label}</span>
      </motion.div>
      <div ref={scroller} className="absolute inset-x-0 top-[96px] bottom-0 overflow-y-auto">
        <motion.div {...(bind() as object)} style={{ y, touchAction: 'pan-x' }} className="relative z-20 min-h-full cursor-grab space-y-2 bg-zinc-100 px-3 pt-2 pb-8 select-none active:cursor-grabbing">
          <AnimatePresence initial={false}>
            {items.map((it) => (
              <motion.div
                key={it.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={`flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-sm ${it.fresh ? 'ring-2 ring-indigo-300' : ''}`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-xl">{it.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[9.5px] text-zinc-400">
                    <span className="font-semibold text-indigo-500">{it.src}</span>· {it.time}
                    {it.fresh && <span className="rounded bg-indigo-500 px-1 text-[8px] font-bold text-white">NEW</span>}
                  </div>
                  <div className="line-clamp-2 text-[12px] leading-snug font-semibold text-zinc-800">{it.title}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </PhoneFrame>
  )
}
