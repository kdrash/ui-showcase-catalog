import { useEffect, useRef, useState } from 'react'
import NumberFlow, { NumberFlowGroup, type Format } from '@number-flow/react'
import { motion, useInView } from 'motion/react'
import { RotateCcw, TrendingDown, TrendingUp } from 'lucide-react'

type Stat = { label: string; value: number; format: Format; suffix?: string; trend: string; up: boolean; spark: number[] }

const STATS: Stat[] = [
  { label: '導入企業数', value: 12480, format: { useGrouping: true }, suffix: '社', trend: '+18.2%', up: true, spark: [3, 4, 4, 6, 7, 7, 9, 11, 12] },
  { label: '月間処理件数', value: 320_000_000, format: { notation: 'compact', maximumFractionDigits: 1 }, suffix: '件', trend: '+41%', up: true, spark: [2, 3, 5, 4, 6, 8, 9, 10, 13] },
  { label: '稼働率 (直近12か月)', value: 99.99, format: { minimumFractionDigits: 2, maximumFractionDigits: 2 }, suffix: '%', trend: 'SLA 99.9%', up: true, spark: [9, 9, 10, 9, 10, 10, 10, 10, 10] },
  { label: '平均応答時間', value: 38, format: {}, suffix: 'ms', trend: '-24ms', up: false, spark: [12, 11, 10, 9, 8, 6, 5, 5, 4] },
]

function Spark({ data, show, color }: { data: number[]; show: boolean; color: string }) {
  const max = Math.max(...data)
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (data.length - 1)) * 100} ${30 - (v / max) * 26}`).join(' ')
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-full overflow-visible" preserveAspectRatio="none">
      <motion.path
        d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }} animate={{ pathLength: show ? 1 : 0 }} transition={{ duration: 1.4, ease: 'easeOut' }}
      />
    </svg>
  )
}

export function StatsBand() {
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { amount: 0.4 })
  const [run, setRun] = useState(0)
  const [shown, setShown] = useState(false)
  const [live, setLive] = useState(1842)

  // 画面に入ったら 0 → 本来の値へ(NumberFlow が桁ごとに回転してアニメーション)
  useEffect(() => {
    if (!inView) return setShown(false)
    const t = setTimeout(() => setShown(true), 150)
    return () => clearTimeout(t)
  }, [inView, run])

  // ライブで増減するカウンター
  useEffect(() => {
    const id = setInterval(() => setLive((v) => Math.max(1200, v + Math.round((Math.random() - 0.4) * 40))), 1600)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={rootRef} className="@container relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,#312e81,#0b0a1f_70%)] font-[Inter,'Noto_Sans_JP',sans-serif] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(black,transparent)]" />
      <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-center gap-6 px-5 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.25em] text-indigo-300 uppercase">By the numbers</p>
            <h2 className="mt-1 text-[clamp(18px,3.6cqw,30px)] font-bold">数字で見る Flowline</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              いま処理中 <NumberFlow value={live} className="font-semibold tabular-nums" />件
            </span>
            <button
              onClick={() => {
                setShown(false)
                setRun((r) => r + 1)
              }}
              title="もう一度"
              className="rounded-full border border-white/15 p-1.5 text-zinc-300 hover:bg-white/10"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
        <NumberFlowGroup>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 @3xl:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col gap-2 bg-[#0d0c24]/90 p-4 backdrop-blur">
                <span className="text-[11px] text-zinc-400">{s.label}</span>
                <span className="flex items-baseline gap-1 text-[clamp(24px,5cqw,38px)] leading-none font-bold tracking-tight">
                  <NumberFlow value={shown ? s.value : 0} format={s.format} locales="ja-JP" className="tabular-nums" />
                  <span className="text-sm font-medium text-zinc-400">{s.suffix}</span>
                </span>
                <span
                  className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    s.up ? 'bg-emerald-400/15 text-emerald-300' : 'bg-sky-400/15 text-sky-300'
                  }`}
                >
                  {s.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {s.trend}
                </span>
                <Spark data={s.spark} show={shown} color={s.up ? '#34d399' : '#38bdf8'} />
              </div>
            ))}
          </div>
        </NumberFlowGroup>
      </div>
    </div>
  )
}
