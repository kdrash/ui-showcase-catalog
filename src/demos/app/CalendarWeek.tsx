import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, addWeeks, format, isSameDay, startOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

type Ev = { id: number; day: Date; start: number; end: number; title: string; color: number }
const COLORS = [
  'bg-violet-100 border-violet-400 text-violet-900',
  'bg-sky-100 border-sky-400 text-sky-900',
  'bg-emerald-100 border-emerald-400 text-emerald-900',
  'bg-amber-100 border-amber-400 text-amber-900',
  'bg-rose-100 border-rose-400 text-rose-900',
]
const H0 = 8
const H1 = 21
const ROW = 40 // 1時間の高さ(px)
const fmt = (h: number) => `${Math.floor(h)}:${h % 1 ? '30' : '00'}`

function seed(week: Date): Ev[] {
  const d = (n: number) => addDays(week, n)
  return [
    { id: 1, day: d(0), start: 9, end: 10, title: '朝会', color: 1 },
    { id: 2, day: d(0), start: 13, end: 15, title: 'デザインレビュー', color: 0 },
    { id: 3, day: d(1), start: 10, end: 11.5, title: '採用面接', color: 4 },
    { id: 4, day: d(1), start: 10.5, end: 12, title: '1on1 · 田中', color: 2 },
    { id: 5, day: d(2), start: 9, end: 10, title: '朝会', color: 1 },
    { id: 6, day: d(2), start: 15, end: 17, title: 'スプリント計画', color: 3 },
    { id: 7, day: d(3), start: 12, end: 13, title: 'ランチ会 🍣', color: 2 },
    { id: 8, day: d(3), start: 14, end: 16, title: '顧客デモ', color: 0 },
    { id: 9, day: d(3), start: 14.5, end: 15.5, title: '資料レビュー', color: 4 },
    { id: 10, day: d(4), start: 16, end: 18, title: '振り返り', color: 3 },
    { id: 11, day: d(5), start: 10, end: 12, title: 'ジム 🏋️', color: 2 },
  ]
}

/** 重なるイベントを横に並べる簡易レイアウト */
function layout(evs: Ev[]) {
  const sorted = [...evs].sort((a, b) => a.start - b.start || b.end - a.end)
  const out: { ev: Ev; col: number; cols: number }[] = []
  let cluster: { ev: Ev; col: number }[] = []
  let clusterEnd = -1
  const flush = () => {
    const n = Math.max(...cluster.map((c) => c.col)) + 1
    cluster.forEach((c) => out.push({ ...c, cols: n }))
    cluster = []
  }
  for (const ev of sorted) {
    if (ev.start >= clusterEnd && cluster.length) flush()
    const used = cluster.filter((c) => c.ev.end > ev.start).map((c) => c.col)
    let col = 0
    while (used.includes(col)) col++
    cluster.push({ ev, col })
    clusterEnd = Math.max(clusterEnd, ev.end)
  }
  if (cluster.length) flush()
  return out
}

export function CalendarWeek() {
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [events, setEvents] = useState<Ev[]>(() => seed(startOfWeek(new Date(), { weekStartsOn: 1 })))
  const [drag, setDrag] = useState<{ day: number; a: number; b: number } | null>(null)
  const [now, setNow] = useState(new Date())
  const scroller = useRef<HTMLDivElement>(null)
  const nextId = useRef(100)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    scroller.current?.scrollTo({ top: ROW * 1 })
    return () => clearInterval(t)
  }, [])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week])
  const slotAt = (e: React.PointerEvent, el: HTMLElement) => {
    const y = e.clientY - el.getBoundingClientRect().top
    return Math.max(H0, Math.min(H1 - 0.5, H0 + Math.floor((y / ROW) * 2) / 2))
  }

  const nowH = now.getHours() + now.getMinutes() / 60

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white font-sans text-zinc-800 select-none">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5">
        <div className="text-[15px] font-semibold">{format(week, 'yyyy年 M月', { locale: ja })}</div>
        <div className="ml-2 flex items-center rounded-lg border border-zinc-200">
          <button type="button" onClick={() => setWeek((w) => addWeeks(w, -1))} className="p-1 hover:bg-zinc-100">
            <ChevronLeft size={15} />
          </button>
          <button type="button" onClick={() => setWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="border-x border-zinc-200 px-2 text-[12px] hover:bg-zinc-100">
            今日
          </button>
          <button type="button" onClick={() => setWeek((w) => addWeeks(w, 1))} className="p-1 hover:bg-zinc-100">
            <ChevronRight size={15} />
          </button>
        </div>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-zinc-400">
          <Plus size={12} /> 空き枠をドラッグで予定を作成
        </span>
      </div>

      <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-zinc-200 text-center">
        <div />
        {days.map((d) => {
          const today = isSameDay(d, now)
          return (
            <div key={d.toISOString()} className="py-1.5">
              <div className={`text-[10px] ${d.getDay() === 0 ? 'text-rose-500' : d.getDay() === 6 ? 'text-sky-500' : 'text-zinc-400'}`}>{format(d, 'E', { locale: ja })}</div>
              <div className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-[14px] font-semibold ${today ? 'bg-violet-600 text-white' : ''}`}>{format(d, 'd')}</div>
            </div>
          )
        })}
      </div>

      <div ref={scroller} className="thin-scroll relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative grid grid-cols-[48px_repeat(7,1fr)]" style={{ height: (H1 - H0) * ROW }}>
          <div className="relative">
            {Array.from({ length: H1 - H0 }, (_, i) => (
              <div key={i} className="absolute right-1.5 -translate-y-1/2 text-[10px] text-zinc-400" style={{ top: i * ROW }}>
                {i === 0 ? '' : `${H0 + i}:00`}
              </div>
            ))}
          </div>
          {days.map((d, di) => {
            const evs = layout(events.filter((e) => isSameDay(e.day, d)))
            return (
              <div
                key={d.toISOString()}
                className="relative border-l border-zinc-100"
                style={{ backgroundImage: `repeating-linear-gradient(to bottom, #f4f4f5 0 1px, transparent 1px ${ROW}px)` }}
                onPointerDown={(e) => {
                  if (e.target !== e.currentTarget) return
                  e.currentTarget.setPointerCapture(e.pointerId)
                  const h = slotAt(e, e.currentTarget)
                  setDrag({ day: di, a: h, b: h + 0.5 })
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.day !== di) return
                  const h = slotAt(e, e.currentTarget)
                  setDrag({ ...drag, b: Math.max(drag.a + 0.5, h + 0.5) })
                }}
                onPointerUp={() => {
                  if (!drag || drag.day !== di) return
                  setEvents((es) => [...es, { id: nextId.current++, day: d, start: drag.a, end: drag.b, title: '新しい予定', color: nextId.current % COLORS.length }])
                  setDrag(null)
                }}
              >
                {evs.map(({ ev, col, cols }) => (
                  <div
                    key={ev.id}
                    className={`absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-[11px] leading-tight shadow-sm transition hover:z-10 hover:shadow-md ${COLORS[ev.color]}`}
                    style={{ top: (ev.start - H0) * ROW + 1, height: (ev.end - ev.start) * ROW - 2, left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)` }}
                    onDoubleClick={() => setEvents((es) => es.filter((x) => x.id !== ev.id))}
                    title="ダブルクリックで削除"
                  >
                    <div className="truncate font-semibold">{ev.title}</div>
                    <div className="opacity-70">
                      {fmt(ev.start)}–{fmt(ev.end)}
                    </div>
                  </div>
                ))}
                {drag && drag.day === di && (
                  <div
                    className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-dashed border-violet-400 bg-violet-200/50 px-1.5 text-[11px] font-semibold text-violet-800"
                    style={{ top: (drag.a - H0) * ROW, height: (drag.b - drag.a) * ROW }}
                  >
                    {fmt(drag.a)}–{fmt(drag.b)}
                  </div>
                )}
                {isSameDay(d, now) && nowH >= H0 && nowH <= H1 && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-rose-500" style={{ top: (nowH - H0) * ROW }}>
                    <span className="absolute -top-[5px] -left-[5px] h-3 w-3 rounded-full bg-rose-500" />
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
