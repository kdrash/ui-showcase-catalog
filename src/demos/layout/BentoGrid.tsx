import { motion, type Variants } from 'motion/react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Cpu, Lock, Music2, Sun, TrendingUp } from 'lucide-react'

/**
 * Apple 風ベントーグリッド。
 * - CSS Grid (grid-cols-4 / grid-rows-3) + col-span / row-span で大小タイル
 * - Motion の variants + staggerChildren で順番に出現
 * - 各タイル内に小さなループアニメ(リング描画・イコライザ・回転・パルス)
 */

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

function Tile({
  className = '',
  children,
  onHoverStart,
  onHoverEnd,
}: {
  className?: string
  children: ReactNode
  onHoverStart?: () => void
  onHoverEnd?: () => void
}) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4 }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      className={`relative overflow-hidden rounded-3xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] ${className}`}
    >
      {children}
    </motion.div>
  )
}

function PerformanceTile() {
  const gid = 'perf' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <Tile className="col-span-2 row-span-2 flex flex-col justify-between bg-zinc-950 text-white">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">Performance</p>
        <h3 className="mt-1 text-xl font-semibold leading-tight">
          描画速度が
          <br />
          <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
            2.4倍
          </span>
          に。
        </h3>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="max-w-[9rem] text-[11px] leading-relaxed text-zinc-400">
          新しいレンダリングエンジンが60fpsを安定して維持します。
        </p>
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={`url(#${gid})`}
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 0.82 }}
              transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-lg font-semibold">82%</div>
        </div>
      </div>
    </Tile>
  )
}

function WeatherTile() {
  return (
    <Tile className="bg-gradient-to-br from-sky-400 to-blue-600 text-white">
      <motion.div
        className="absolute -right-3 -top-3 text-amber-200"
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      >
        <Sun size={56} strokeWidth={1.5} />
      </motion.div>
      <p className="text-[11px] font-medium opacity-80">東京</p>
      <p className="absolute bottom-3 left-4 text-3xl font-light">23°</p>
    </Tile>
  )
}

function MusicTile() {
  return (
    <Tile className="flex flex-col justify-between bg-white">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-500">
        <Music2 size={13} /> Now Playing
      </div>
      <div className="flex h-8 items-end gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 origin-bottom rounded-full bg-gradient-to-t from-rose-500 to-orange-400"
            style={{ height: '100%' }}
            animate={{ scaleY: [0.3, 1, 0.5, 0.85, 0.35] }}
            transition={{ duration: 1.1 + i * 0.17, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
          />
        ))}
      </div>
      <p className="truncate text-xs font-semibold text-zinc-800">Lo-fi Beats</p>
    </Tile>
  )
}

const SPARK = [12, 18, 14, 22, 19, 28, 24, 33, 30, 38, 35, 46]

function ChartTile() {
  const gid = 'spark' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const w = 200
  const h = 60
  const max = Math.max(...SPARK)
  const pts = SPARK.map((v, i) => [(i / (SPARK.length - 1)) * w, h - (v / max) * (h - 6) - 3] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  return (
    <Tile className="col-span-2 flex flex-col justify-between bg-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-zinc-500">月間売上</p>
          <p className="text-xl font-semibold tracking-tight text-zinc-900">¥4.6M</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
          <TrendingUp size={12} /> +24%
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-12 w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill={`url(#${gid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.3 }}
        />
      </svg>
    </Tile>
  )
}

function ClockTile() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <Tile className="flex flex-col justify-center bg-white">
      <p className="text-[11px] font-medium text-zinc-500">
        {now.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
      </p>
      <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
        {pad(now.getHours())}:{pad(now.getMinutes())}
        <span className="text-sm text-zinc-400">:{pad(now.getSeconds())}</span>
      </p>
    </Tile>
  )
}

function PrivacyTile() {
  return (
    <Tile className="grid place-items-center bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute h-12 w-12 rounded-full border border-white/70"
          animate={{ scale: [1, 2.6], opacity: [0.7, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
        />
      ))}
      <div className="relative grid h-12 w-12 place-items-center rounded-full bg-white/20 backdrop-blur">
        <Lock size={20} />
      </div>
    </Tile>
  )
}

const PEOPLE = [
  { i: 'AK', c: 'bg-amber-400' },
  { i: 'MS', c: 'bg-sky-400' },
  { i: 'YT', c: 'bg-violet-400' },
  { i: 'RN', c: 'bg-rose-400' },
]

function TeamTile() {
  const [hover, setHover] = useState(false)
  return (
    <Tile
      className="flex flex-col justify-between bg-white"
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
    >
      <p className="text-[11px] font-medium text-zinc-500">チーム</p>
      <div className="flex">
        {PEOPLE.map((p, idx) => (
          <motion.span
            key={p.i}
            animate={{ x: hover ? idx * 6 : 0, y: hover && idx % 2 ? -3 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`-ml-2 grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white first:ml-0 ${p.c}`}
          >
            {p.i}
          </motion.span>
        ))}
      </div>
      <p className="text-xs font-semibold text-zinc-800">+12 メンバー</p>
    </Tile>
  )
}

function ChipTile() {
  return (
    <Tile className="bg-zinc-100">
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <motion.div
          className="absolute left-1/2 top-1/2 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'conic-gradient(from 0deg, #f472b6, #a78bfa, #38bdf8, #34d399, #f472b6)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <div className="absolute inset-[2px] flex flex-col items-center justify-center gap-1 rounded-[22px] bg-zinc-950 text-white">
        <Cpu size={26} className="text-violet-300" />
        <p className="text-[11px] font-semibold tracking-wide">Neural Core</p>
      </div>
    </Tile>
  )
}

export function BentoGrid() {
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#f5f5f7] p-3"
      style={{ fontFamily: "Inter, 'Noto Sans JP', sans-serif" }}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid h-full grid-cols-4 grid-rows-3 gap-3"
      >
        <PerformanceTile />
        <WeatherTile />
        <MusicTile />
        <ChartTile />
        <ClockTile />
        <PrivacyTile />
        <TeamTile />
        <ChipTile />
      </motion.div>
    </div>
  )
}
