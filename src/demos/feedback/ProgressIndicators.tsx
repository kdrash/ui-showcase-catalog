import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Pause, Play, RotateCcw, CloudUpload } from 'lucide-react'

const CSS = `@keyframes pi-indet{0%{left:-35%;right:100%}60%{left:100%;right:-90%}100%{left:100%;right:-90%}}
@keyframes pi-indet2{0%{left:-200%;right:100%}60%{left:107%;right:-8%}100%{left:107%;right:-8%}}`

function useTicker(speed: number, running = true) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setV((x) => (x >= 100 ? 0 : Math.min(100, x + speed))), 80)
    return () => clearInterval(id)
  }, [speed, running])
  return [v, setV] as const
}

const card = 'rounded-xl border border-zinc-200 bg-white p-3'
const label = 'mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400'

export function ProgressIndicators() {
  const [linear] = useTicker(0.9)
  const [circle] = useTicker(0.7)
  const [step, setStep] = useState(1)
  const [upload, setUpload] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 5), 1500)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (paused || upload >= 100) return
    timer.current = window.setTimeout(() => setUpload((u) => Math.min(100, u + Math.random() * 4 + 0.5)), 90)
    return () => clearTimeout(timer.current)
  }, [upload, paused])

  const R = 26
  const C = 2 * Math.PI * R
  const steps = ['カート', '配送', '支払い', '確認']
  const storage = [
    ['写真', 38, '#8b5cf6'],
    ['動画', 22, '#ec4899'],
    ['書類', 12, '#f59e0b'],
    ['アプリ', 9, '#10b981'],
  ] as const

  return (
    <div className="relative h-full w-full overflow-auto bg-zinc-50 p-4 font-sans text-zinc-800">
      <style>{CSS}</style>
      <div className="grid grid-cols-2 gap-3">
        <div className={card}>
          <div className={label}>リニア</div>
          <div className="mb-1 flex justify-between text-[11px] text-zinc-500">
            <span>同期中…</span>
            <span className="tabular-nums">{Math.round(linear)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-[width] duration-100" style={{ width: `${linear}%` }} />
          </div>
          <div className="mt-3 mb-1 text-[11px] text-zinc-500">不確定(indeterminate)</div>
          <div className="relative h-1 overflow-hidden rounded-full bg-indigo-100">
            <div className="absolute inset-y-0 bg-indigo-500" style={{ animation: 'pi-indet 2.1s cubic-bezier(.65,.815,.735,.395) infinite' }} />
            <div className="absolute inset-y-0 bg-indigo-500" style={{ animation: 'pi-indet2 2.1s cubic-bezier(.165,.84,.44,1) 1.15s infinite' }} />
          </div>
        </div>

        <div className={`${card} flex items-center gap-3`}>
          <svg width="68" height="68" viewBox="0 0 68 68" className="-rotate-90">
            <circle cx="34" cy="34" r={R} fill="none" stroke="#f4f4f5" strokeWidth="7" />
            <circle
              cx="34"
              cy="34"
              r={R}
              fill="none"
              stroke="url(#pig)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - circle / 100)}
              style={{ transition: 'stroke-dashoffset .1s' }}
            />
            <defs>
              <linearGradient id="pig">
                <stop offset="0" stopColor="#f43f5e" />
                <stop offset="1" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <div className="text-2xl font-bold tabular-nums">{Math.round(circle)}%</div>
            <div className="text-[11px] text-zinc-500">今週の目標達成率</div>
          </div>
        </div>

        <div className={`${card} col-span-2`}>
          <div className={label}>ステップ</div>
          <div className="flex items-center">
            {steps.map((s, i) => {
              const done = i < step
              const active = i === step
              return (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <motion.div
                      animate={{ scale: active ? 1.12 : 1, backgroundColor: done ? '#10b981' : active ? '#18181b' : '#e4e4e7' }}
                      className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white"
                    >
                      {done ? <Check size={14} strokeWidth={3} /> : <span className={active ? '' : 'text-zinc-500'}>{i + 1}</span>}
                    </motion.div>
                    <span className={`text-[10px] ${active ? 'font-semibold text-zinc-900' : 'text-zinc-400'}`}>{s}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="mx-1 mb-4 h-0.5 flex-1 overflow-hidden rounded bg-zinc-200">
                      <motion.div className="h-full bg-emerald-500" animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.5 }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className={card}>
          <div className={label}>ストレージ</div>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-zinc-100">
            {storage.map(([n, v, c], i) => (
              <motion.div key={n} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ delay: i * 0.12, duration: 0.6 }} style={{ background: c }} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
            {storage.map(([n, v, c]) => (
              <span key={n} className="inline-flex items-center gap-1">
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: c }} /> {n} {v}GB
              </span>
            ))}
          </div>
          <div className="mt-1 text-[10px] text-zinc-400">81GB / 128GB 使用中</div>
        </div>

        <div className={card}>
          <div className={label}>アップロード</div>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-500">
              {upload >= 100 ? <Check size={16} className="text-emerald-500" /> : <CloudUpload size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-[11px]">
                <span className="truncate font-medium">企画書_v3.pdf</span>
                <span className="text-zinc-400 tabular-nums">{upload >= 100 ? '完了' : `${(upload * 0.042).toFixed(1)}/4.2MB`}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-[width] ${upload >= 100 ? 'bg-emerald-500' : paused ? 'bg-amber-400' : 'bg-sky-500'}`}
                  style={{ width: `${upload}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => (upload >= 100 ? (setUpload(0), setPaused(false)) : setPaused((p) => !p))}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              title={upload >= 100 ? 'もう一度' : paused ? '再開' : '一時停止'}
            >
              {upload >= 100 ? <RotateCcw size={12} /> : paused ? <Play size={12} /> : <Pause size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
