import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Flame, Trophy, CalendarDays } from 'lucide-react'

const YEARS = [2024, 2025, 2026]
const LEVELS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
const WEEKDAYS = ['', '月', '', '水', '', '金', '']

type Day = { date: Date; count: number; col: number; row: number }

function build(year: number): Day[] {
  let s = year * 7919
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const days: Day[] = []
  const start = new Date(year, 0, 1)
  const offset = start.getDay()
  for (let d = new Date(start); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
    const idx = Math.round((d.getTime() - start.getTime()) / 86400000) + offset
    const weekend = d.getDay() === 0 || d.getDay() === 6
    // 季節で波がある活動量 + たまの休み
    const season = 0.55 + 0.45 * Math.sin((idx / 365) * Math.PI * 2 + year)
    const r = rnd()
    const count = r < (weekend ? 0.55 : 0.15) ? 0 : Math.round(r * 9 * season + (r > 0.93 ? 8 : 0))
    days.push({ date: new Date(d), count, col: Math.floor(idx / 7), row: d.getDay() })
  }
  return days
}
const level = (c: number) => (c === 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : c < 9 ? 3 : 4)

/** GitHub 風の年間コントリビューション・カレンダー(SVG) */
export function ContributionHeatmap() {
  const [year, setYear] = useState(2026)
  const [tip, setTip] = useState<{ x: number; y: number; d: Day } | null>(null)
  const [width, setWidth] = useState(520)
  const box = useRef<HTMLDivElement>(null)
  const days = useMemo(() => build(year), [year])

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(box.current!)
    return () => ro.disconnect()
  }, [])

  const stats = useMemo(() => {
    let total = 0
    let best = 0
    let run = 0
    let busiest = days[0]
    for (const d of days) {
      total += d.count
      run = d.count ? run + 1 : 0
      best = Math.max(best, run)
      if (d.count > busiest.count) busiest = d
    }
    return { total, best, current: run, busiest }
  }, [days])

  const cols = 53
  const gap = 3
  const left = 22
  const cell = Math.max(5, Math.min(14, (width - left - cols * gap) / cols))
  const svgW = left + cols * (cell + gap)
  const svgH = 16 + 7 * (cell + gap)
  const months = Array.from({ length: 12 }, (_, m) => {
    const first = days.find((d) => d.date.getMonth() === m && d.date.getDate() === 1)!
    return { m, x: left + first.col * (cell + gap) }
  })

  return (
    <div className="relative flex h-full w-full flex-col justify-center gap-3 overflow-hidden bg-[#0d1117] px-4 py-3 text-[#c9d1d9]">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <b className="text-white">{stats.total.toLocaleString()}</b> contributions in {year}
        </div>
        <div className="flex gap-1">
          {YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`rounded-md px-2 py-0.5 text-[11px] ${y === year ? 'bg-[#1f6feb] text-white' : 'text-[#8b949e] hover:bg-white/5'}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div ref={box} className="relative rounded-lg border border-[#30363d] p-3">
        <svg width={svgW} height={svgH} className="block" onMouseLeave={() => setTip(null)}>
          {months.map(({ m, x }) => (
            <text key={m} x={x} y={10} fontSize={9.5} fill="#8b949e">
              {m + 1}月
            </text>
          ))}
          {WEEKDAYS.map((w, i) => (
            <text key={i} x={0} y={16 + i * (cell + gap) + cell * 0.8} fontSize={9} fill="#8b949e">
              {w}
            </text>
          ))}
          {days.map((d, i) => (
            <motion.rect
              key={`${year}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: d.col * 0.008 }}
              x={left + d.col * (cell + gap)}
              y={16 + d.row * (cell + gap)}
              width={cell}
              height={cell}
              rx={2}
              fill={LEVELS[level(d.count)]}
              stroke={tip?.d === d ? '#fff' : 'rgba(255,255,255,0.04)'}
              onMouseEnter={(e) => {
                const r = box.current!.getBoundingClientRect()
                const c = (e.target as SVGRectElement).getBoundingClientRect()
                setTip({ x: c.left - r.left + c.width / 2, y: c.top - r.top, d })
              }}
            />
          ))}
        </svg>
        {tip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-[#6e7681] px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-lg"
            style={{ left: tip.x, top: tip.y - 6 }}
          >
            <b>{tip.d.count ? `${tip.d.count} contributions` : 'No contributions'}</b>{' '}
            {tip.d.date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
        )}
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[#8b949e]">
          少
          {LEVELS.map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />
          ))}
          多
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        {[
          { icon: Trophy, label: '最長連続', value: `${stats.best}日` },
          { icon: Flame, label: '現在の連続', value: `${stats.current}日` },
          {
            icon: CalendarDays,
            label: '最多の日',
            value: `${stats.busiest.date.getMonth() + 1}/${stats.busiest.date.getDate()} (${stats.busiest.count})`,
          },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-lg border border-[#30363d] px-2.5 py-2">
            <s.icon size={14} className="text-[#39d353]" />
            <div>
              <div className="text-[#8b949e]">{s.label}</div>
              <div className="font-semibold text-white">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
