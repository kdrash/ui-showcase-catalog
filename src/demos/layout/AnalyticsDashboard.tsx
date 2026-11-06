import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useId, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

/**
 * ダークなアナリティクスダッシュボード。
 * - Recharts: AreaChart(グラデ塗り) / BarChart(積み上げ) / PieChart(ドーナツ) / RadialBarChart(目標達成率) / LineChart(KPIスパークライン)
 * - 期間タブ(7D/30D/90D)は Motion の layoutId でピルがスライド
 * - KPIの数値は Motion の animate() でカウントアップ
 */

type Range = '7D' | '30D' | '90D'
const RANGES: Range[] = ['7D', '30D', '90D']

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function buildData(range: Range) {
  const n = range === '7D' ? 7 : range === '30D' ? 30 : 13
  const r = rng(range === '7D' ? 7 : range === '30D' ? 30 : 90)
  const days = ['月', '火', '水', '木', '金', '土', '日']
  const series = Array.from({ length: n }, (_, i) => {
    const base = 40 + i * (range === '90D' ? 4 : 1.2)
    const revenue = Math.round(base + r() * 30 + Math.sin(i / 2) * 10)
    const visitors = Math.round(revenue * (0.6 + r() * 0.3))
    const label = range === '7D' ? days[i] : range === '30D' ? `${i + 1}` : `W${i + 1}`
    return { label, revenue, visitors, newUsers: Math.round(r() * 30 + 10), returning: Math.round(r() * 25 + 8) }
  })
  const scale = range === '7D' ? 1 : range === '30D' ? 4.1 : 12.5
  const sources = [
    { name: 'Organic', value: Math.round(42 * (0.8 + r() * 0.4)) },
    { name: 'Social', value: Math.round(26 * (0.8 + r() * 0.4)) },
    { name: 'Direct', value: Math.round(18 * (0.8 + r() * 0.4)) },
    { name: 'Referral', value: Math.round(14 * (0.8 + r() * 0.4)) },
  ]
  return {
    series,
    bars: series.slice(-7),
    sources,
    goal: Math.round(55 + r() * 40),
    kpis: [
      { label: '売上', value: 1_284_000 * scale, prefix: '¥', delta: 12.4, key: 'revenue' as const },
      { label: '訪問者', value: 48_210 * scale, prefix: '', delta: 8.1, key: 'visitors' as const },
      { label: 'CVR', value: 3.42 + r(), prefix: '', suffix: '%', delta: -1.2, key: 'newUsers' as const, decimals: 2 },
      { label: '新規登録', value: 2_340 * scale, prefix: '', delta: 21.7, key: 'returning' as const },
    ],
  }
}

const SOURCE_COLORS = ['#8b5cf6', '#22d3ee', '#f472b6', '#facc15']

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) =>
    `${prefix}${v.toLocaleString('ja-JP', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`,
  )
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [mv, value])
  return <motion.span>{text}</motion.span>
}

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(24,24,27,0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    fontSize: 11,
    color: '#e4e4e7',
  },
  labelStyle: { color: '#a1a1aa' },
  itemStyle: { padding: 0 },
}

const card = 'rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3'

export function AnalyticsDashboard() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [range, setRange] = useState<Range>('30D')
  const data = useMemo(() => buildData(range), [range])

  return (
    <div
      className="relative flex h-full w-full flex-col gap-3 overflow-hidden bg-zinc-950 p-4 text-zinc-100"
      style={{ fontFamily: "Inter, 'Noto Sans JP', sans-serif" }}
    >
      <div className="pointer-events-none absolute -top-24 left-1/3 h-48 w-96 rounded-full bg-violet-600/20 blur-3xl" />

      {/* header */}
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Dashboard</p>
          <h3 className="text-base font-semibold">Overview</h3>
        </div>
        <div className="flex rounded-full border border-white/10 bg-white/5 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`relative rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${range === r ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {range === r && (
                <motion.span
                  layoutId={`range-pill-${uid}`}
                  className="absolute inset-0 rounded-full bg-white"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{r}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="relative grid grid-cols-4 gap-3">
        {data.kpis.map((k) => (
          <div key={k.label} className={`${card} flex items-end justify-between gap-2`}>
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500">{k.label}</p>
              <p className="truncate text-base font-semibold tabular-nums">
                <AnimatedNumber value={k.value} prefix={k.prefix} suffix={k.suffix} decimals={k.decimals} />
              </p>
              <span
                className={`mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold ${k.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {k.delta >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {Math.abs(k.delta)}%
              </span>
            </div>
            <div className="h-8 w-14 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series}>
                  <Line
                    type="monotone"
                    dataKey={k.key}
                    stroke={k.delta >= 0 ? '#34d399' : '#fb7185'}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* charts */}
      <div className="relative grid min-h-0 flex-1 grid-cols-4 gap-3">
        <div className={`${card} col-span-2 flex min-h-0 flex-col`}>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium">売上と訪問者</p>
            <div className="flex gap-3 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <i className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                売上
              </span>
              <span className="flex items-center gap-1">
                <i className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                訪問者
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id={`rev-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`vis-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <Tooltip {...tooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="売上"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  fill={`url(#rev-${uid})`}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  name="訪問者"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill={`url(#vis-${uid})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${card} flex min-h-0 flex-col`}>
          <p className="mb-1 text-xs font-medium">新規 / リピーター</p>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bars} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#71717a', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="newUsers" name="新規" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="returning" name="リピーター" stackId="a" fill="#f472b6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid min-h-0 grid-rows-2 gap-3">
          <div className={`${card} flex min-h-0 items-center gap-2`}>
            <div className="h-full min-h-0 w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Pie
                    data={data.sources}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="92%"
                    paddingAngle={3}
                    cornerRadius={3}
                    stroke="none"
                  >
                    {data.sources.map((s, i) => (
                      <Cell key={s.name} fill={SOURCE_COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-0.5 text-[10px] text-zinc-400">
              {data.sources.map((s, i) => (
                <li key={s.name} className="flex items-center gap-1.5">
                  <i className="h-1.5 w-1.5 rounded-full" style={{ background: SOURCE_COLORS[i] }} />
                  {s.name}
                </li>
              ))}
            </ul>
          </div>
          <div className={`${card} relative flex min-h-0 items-center gap-2`}>
            <div className="relative h-full min-h-0 w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={[{ name: 'goal', value: data.goal }]}
                  innerRadius="70%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={8} fill="#22d3ee" background={{ fill: 'rgba(255,255,255,0.06)' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-[11px] font-semibold tabular-nums">
                <AnimatedNumber value={data.goal} suffix="%" />
              </div>
            </div>
            <div className="text-[10px] leading-tight text-zinc-400">
              <p className="font-medium text-zinc-200">月間目標</p>
              達成率
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
