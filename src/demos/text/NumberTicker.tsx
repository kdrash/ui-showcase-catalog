import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { RotateCcw, Shuffle } from 'lucide-react'

/** 画面に入ったら 0 → to までカウントアップ。MotionValue を motion.span の子に直接渡せる */
function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 2,
}: {
  to: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const mv = useMotionValue(0)
  const text = useTransform(
    mv,
    (v) =>
      prefix +
      v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) +
      suffix,
  )
  useEffect(() => {
    if (!inView) return
    const c = animate(mv, to, { duration, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [inView, to, duration, mv])
  return (
    <motion.span ref={ref} className="tabular-nums">
      {text}
    </motion.span>
  )
}

/** オドメーター: 0〜9 の縦列を translateY でスプリング回転 */
function Digit({ d, delay }: { d: number; delay: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden leading-none">
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={false}
        animate={{ y: `${-d * 10}%` }}
        transition={{ type: 'spring', stiffness: 70, damping: 14, delay }}
      >
        {Array.from({ length: 10 }).map((_, n) => (
          <span key={n} className="block h-[1em] text-center leading-none">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

const stats = [
  { label: 'アクティブユーザー', to: 12480, bar: 0.78, color: 'from-sky-500 to-cyan-300' },
  { label: '稼働率', to: 98.6, decimals: 1, suffix: '%', bar: 0.986, color: 'from-emerald-500 to-lime-300' },
  { label: '月間売上', to: 3.2, decimals: 1, prefix: '¥', suffix: 'M', bar: 0.64, color: 'from-violet-500 to-fuchsia-300' },
]

export function NumberTicker() {
  const [run, setRun] = useState(0)
  const [downloads, setDownloads] = useState(204816)
  const digits = String(downloads).padStart(6, '0').split('')

  return (
    <div className="@container relative flex h-full w-full flex-col gap-3 overflow-hidden bg-[#0b0b0f] p-4 text-white">
      <div key={run} className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[10px] text-zinc-500">{s.label}</p>
            <p className="mt-1 text-[clamp(16px,5cqw,26px)] font-bold tracking-tight">
              <CountUp to={s.to} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${s.bar * 100}%` }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent">
        <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500">Total downloads</p>
        <div className="flex font-mono text-[clamp(32px,10cqw,52px)] leading-none font-bold">
          {digits.map((c, i) => (
            <span key={i} className="flex">
              {i === 3 && <span className="h-[1em] w-[0.35em] leading-none text-zinc-600">,</span>}
              <Digit d={Number(c)} delay={i * 0.06} />
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2 text-[11px]">
          <button
            onClick={() => setDownloads(Math.floor(Math.random() * 999999))}
            className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-medium text-zinc-900"
          >
            <Shuffle size={12} /> シャッフル
          </button>
          <button
            onClick={() => setRun((r) => r + 1)}
            className="flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1 text-zinc-300"
          >
            <RotateCcw size={12} /> カウントをリプレイ
          </button>
        </div>
      </div>
    </div>
  )
}
