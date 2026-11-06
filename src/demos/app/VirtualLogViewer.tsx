import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDownToLine, CornerDownLeft, Radio } from 'lucide-react'

type Level = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
type Log = { i: number; t: string; level: Level; svc: string; msg: string; stack?: string[] }

const SVCS = ['api', 'auth', 'billing', 'worker', 'search', 'cdn']
const MSGS = [
  'GET /v1/users 200 in 23ms',
  'cache hit ratio 0.97',
  'job queue drained (128 jobs)',
  'POST /v1/orders 201 in 81ms',
  'slow query detected: SELECT * FROM events WHERE ... (1.2s)',
  'token refreshed for session',
  'retrying webhook delivery (attempt 2/5)',
  'connection pool resized to 32',
]
const LEVEL_STYLE: Record<Level, string> = {
  INFO: 'text-sky-400',
  WARN: 'text-amber-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-zinc-500',
}

function makeLog(i: number): Log {
  const h = (i * 2654435761) >>> 0
  const level: Level = h % 23 === 0 ? 'ERROR' : h % 7 === 0 ? 'WARN' : h % 5 === 0 ? 'DEBUG' : 'INFO'
  const sec = 36000 + i * 0.37
  const t = `${String(Math.floor(sec / 3600) % 24).padStart(2, '0')}:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${(sec % 60).toFixed(3).padStart(6, '0')}`
  return {
    i,
    t,
    level,
    svc: SVCS[h % SVCS.length],
    msg: level === 'ERROR' ? 'Unhandled exception: TypeError: Cannot read properties of undefined' : MSGS[(h >>> 3) % MSGS.length],
    stack: level === 'ERROR' ? ['  at handler (src/routes/orders.ts:142:17)', '  at next (node_modules/router/index.js:281:9)', `  at process.tick (node:internal/process:${(h % 90) + 10})`] : undefined,
  }
}

const N = 100_000

export function VirtualLogViewer() {
  const parentRef = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(N)
  const [live, setLive] = useState(false)
  const [jump, setJump] = useState('50000')
  const [highlight, setHighlight] = useState<number | null>(null)
  const cache = useRef(new Map<number, Log>())
  const get = (i: number) => {
    let l = cache.current.get(i)
    if (!l) cache.current.set(i, (l = makeLog(i)))
    return l
  }

  const v = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 22,
    overscan: 12,
  })

  useEffect(() => {
    if (!live) return
    const id = setInterval(() => setCount((c) => c + 3), 250)
    return () => clearInterval(id)
  }, [live])
  useEffect(() => {
    if (live) v.scrollToIndex(count - 1, { align: 'end' })
  }, [count, live, v])

  const go = () => {
    const n = Math.max(0, Math.min(count - 1, parseInt(jump, 10) || 0))
    setLive(false)
    setHighlight(n)
    v.scrollToIndex(n, { align: 'center' })
  }

  const items = v.getVirtualItems()

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0b0d10] font-mono text-[11.5px] text-zinc-300">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.02] px-3 py-2 font-sans text-[12px]">
        <span className="font-semibold text-zinc-100">production.log</span>
        <span className="rounded bg-white/5 px-1.5 py-0.5 tabular-nums text-zinc-400">{count.toLocaleString()} 行</span>
        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 tabular-nums text-emerald-400">DOM: {items.length} 行だけ描画</span>
        <div className="ml-auto flex items-center gap-1.5">
          <input
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            className="h-7 w-20 rounded-md border border-white/10 bg-black/40 px-2 text-right font-mono text-zinc-200 outline-none focus:border-sky-500/60"
          />
          <button type="button" onClick={go} className="flex h-7 items-center gap-1 rounded-md border border-white/10 px-2 text-zinc-300 hover:bg-white/10">
            <CornerDownLeft size={12} /> 行へ移動
          </button>
          <button
            type="button"
            onClick={() => setLive((x) => !x)}
            className={`flex h-7 items-center gap-1 rounded-md px-2 transition ${live ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40' : 'border border-white/10 text-zinc-300 hover:bg-white/10'}`}
          >
            {live ? <Radio size={12} className="animate-pulse" /> : <ArrowDownToLine size={12} />} {live ? 'LIVE' : 'ライブ追従'}
          </button>
        </div>
      </div>
      <div ref={parentRef} className="thin-scroll min-h-0 flex-1 overflow-auto" onWheel={() => live && setLive(false)}>
        <div style={{ height: v.getTotalSize(), position: 'relative', width: '100%' }}>
          {items.map((it) => {
            const l = get(it.index)
            return (
              <div
                key={it.key}
                data-index={it.index}
                ref={v.measureElement}
                className={`absolute left-0 w-full border-l-2 px-3 py-[3px] ${
                  highlight === it.index ? 'border-sky-400 bg-sky-500/15' : l.level === 'ERROR' ? 'border-red-500/70 bg-red-500/[0.06]' : 'border-transparent hover:bg-white/[0.03]'
                }`}
                style={{ transform: `translateY(${it.start}px)` }}
              >
                <div className="flex gap-3 whitespace-nowrap">
                  <span className="w-12 shrink-0 text-right text-zinc-600 tabular-nums">{l.i + 1}</span>
                  <span className="text-zinc-500">{l.t}</span>
                  <span className={`w-11 shrink-0 font-semibold ${LEVEL_STYLE[l.level]}`}>{l.level}</span>
                  <span className="w-14 shrink-0 text-violet-300">[{l.svc}]</span>
                  <span className="truncate text-zinc-300">{l.msg}</span>
                </div>
                {l.stack && (
                  <div className="mt-0.5 pl-[13.5rem] text-red-300/70">
                    {l.stack.map((s) => (
                      <div key={s}>{s}</div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
