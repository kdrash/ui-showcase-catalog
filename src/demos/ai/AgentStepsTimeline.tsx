import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Brain, Check, ChevronRight, Code2, Loader, MessageSquareText, Play, Search, Wrench } from 'lucide-react'

type Step = {
  kind: 'think' | 'search' | 'tool' | 'code' | 'answer'
  title: string
  ms: number
  body: ReactNode
}

const json = (o: unknown) => JSON.stringify(o, null, 2)

const STEPS: Step[] = [
  {
    kind: 'think',
    title: '考えています',
    ms: 1600,
    body: (
      <p className="text-zinc-400">
        ユーザーは「来月の東京出張に最適なホテル」を知りたい。条件は ①会場(品川)から徒歩圏 ②1泊2万円以下 ③朝食付き。
        まず候補を検索し、料金APIで空室と価格を確認してから、距離と評価でスコアリングする。
      </p>
    ),
  },
  {
    kind: 'search',
    title: 'Web を検索',
    ms: 1300,
    body: (
      <ul className="space-y-1">
        {['品川駅 ホテル 朝食付き 口コミ', '品川 ビジネスホテル 2026 料金'].map((q) => (
          <li key={q} className="flex items-center gap-2 text-zinc-300">
            <Search size={11} className="text-zinc-500" />“{q}”<span className="ml-auto text-[10px] text-zinc-500">結果 12件</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    kind: 'tool',
    title: 'ツール呼び出し: hotel_availability',
    ms: 1500,
    body: (
      <div className="grid gap-2 sm:grid-cols-2">
        <Json label="input" text={json({ area: 'shinagawa', checkin: '2026-12-08', nights: 2, max_price: 20000 })} />
        <Json label="output" text={json({ results: [{ name: 'ホテルA', price: 16800, walk_min: 4, rating: 4.4 }, { name: 'ホテルB', price: 18500, walk_min: 2, rating: 4.6 }] })} />
      </div>
    ),
  },
  {
    kind: 'code',
    title: 'コードを実行: スコア計算',
    ms: 1200,
    body: (
      <Json
        label="python"
        text={`score = rating * 20 - walk_min * 2 - price / 1000\n# ホテルA: 88.0 - 8 - 16.8 = 63.2\n# ホテルB: 92.0 - 4 - 18.5 = 69.5  ← 最高`}
      />
    ),
  },
  {
    kind: 'answer',
    title: '回答',
    ms: 0,
    body: (
      <p className="text-[13px] leading-relaxed text-zinc-100">
        おすすめは <b className="text-white">ホテルB</b>(品川駅から徒歩2分・1泊18,500円・朝食付き・評価4.6)です。
        少しでも安く抑えたい場合はホテルA(16,800円)も良い選択です。
      </p>
    ),
  },
]

const ICON = { think: Brain, search: Search, tool: Wrench, code: Code2, answer: MessageSquareText }

function Json({ label, text }: { label: string; text: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-black/40">
      <div className="border-b border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-500">{label}</div>
      <pre className="thin-scroll overflow-x-auto p-2 font-mono text-[10.5px] leading-snug text-sky-200">{text}</pre>
    </div>
  )
}

export function AgentStepsTimeline() {
  const [count, setCount] = useState(0) // 表示済みステップ数
  const [running, setRunning] = useState(-1) // 実行中のステップ index
  const [open, setOpen] = useState<Set<number>>(new Set([0]))
  const [run, setRun] = useState(0)
  const timers = useRef<number[]>([])
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setCount(0)
    setRunning(-1)
    setOpen(new Set([0]))
    let t = 400
    STEPS.forEach((s, i) => {
      timers.current.push(window.setTimeout(() => (setCount(i + 1), setRunning(i)), t))
      t += s.ms
    })
    timers.current.push(window.setTimeout(() => setRunning(-1), t))
    return () => timers.current.forEach(clearTimeout)
  }, [run])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [count])

  const total = STEPS.slice(0, -1).reduce((a, s) => a + s.ms, 0) / 1000

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0a0a0f] text-zinc-200">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5 text-xs">
        <span className="rounded-md bg-white/5 px-2 py-0.5 text-zinc-400">エージェント</span>
        <span className="truncate text-zinc-300">来月の品川出張、朝食付きで2万円以下のホテルを探して</span>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] hover:bg-white/10"
        >
          <Play size={11} /> 再実行
        </button>
      </div>
      <div ref={scroller} className="thin-scroll flex-1 overflow-y-auto px-4 py-3">
        <ol className="relative">
          <AnimatePresence>
            {STEPS.slice(0, count).map((s, i) => {
              const Icon = ICON[s.kind]
              const active = running === i && s.kind !== 'answer'
              const isOpen = open.has(i) || s.kind === 'answer'
              return (
                <motion.li
                  key={`${run}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative pb-3 pl-8"
                >
                  {i < STEPS.length - 1 && i < count - 1 && <span className="absolute top-6 bottom-0 left-[11px] w-px bg-white/10" />}
                  <span
                    className={`absolute top-0.5 left-0 grid h-6 w-6 place-items-center rounded-full border ${
                      s.kind === 'answer' ? 'border-violet-400/50 bg-violet-500/20 text-violet-200' : 'border-white/10 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    {active ? <Loader size={12} className="animate-spin text-sky-300" /> : <Icon size={12} />}
                  </span>
                  <button
                    type="button"
                    disabled={s.kind === 'answer'}
                    onClick={() => setOpen((o) => (o.has(i) ? new Set([...o].filter((x) => x !== i)) : new Set([...o, i])))}
                    className="flex w-full items-center gap-2 py-0.5 text-left text-[12.5px]"
                  >
                    {active && s.kind === 'think' ? (
                      <span className="animate-[ag-shimmer_1.5s_linear_infinite] bg-[linear-gradient(90deg,#71717a_0%,#fafafa_50%,#71717a_100%)] bg-[length:200%_100%] bg-clip-text font-medium text-transparent">
                        考え中…
                      </span>
                    ) : (
                      <span className={`font-medium ${s.kind === 'answer' ? 'text-white' : 'text-zinc-300'}`}>{s.title}</span>
                    )}
                    {s.kind !== 'answer' && (
                      <>
                        <span className="ml-auto font-mono text-[10px] text-zinc-500">{active ? '実行中' : `${(s.ms / 1000).toFixed(1)}s`}</span>
                        {!active && <Check size={12} className="text-emerald-400" />}
                        <ChevronRight size={13} className={`text-zinc-500 transition ${isOpen ? 'rotate-90' : ''}`} />
                      </>
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className={`mt-1.5 text-[11.5px] leading-relaxed ${
                            s.kind === 'answer' ? 'rounded-lg border border-violet-400/20 bg-violet-500/[0.07] p-3' : 'rounded-lg bg-white/[0.03] p-2.5'
                          }`}
                        >
                          {s.body}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
        {count === STEPS.length && running === -1 && (
          <div className="pl-8 text-[10.5px] text-zinc-500">完了 · 4ステップ · {total.toFixed(1)}秒 · ツール1回 · 検索2回</div>
        )}
      </div>
      <style>{'@keyframes ag-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}'}</style>
    </div>
  )
}
