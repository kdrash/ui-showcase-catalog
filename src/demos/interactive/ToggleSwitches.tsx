import { useId, useState, type ReactNode } from 'react'
import { LayoutGroup, motion } from 'motion/react'

function Cell({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl p-3 ${className}`}>
      {children}
      <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">{label}</span>
    </div>
  )
}

/** iOS: justify-start/end を切り替え、ノブの layout アニメーションで移動 */
function IOSSwitch() {
  const [on, setOn] = useState(true)
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors duration-300 ${
        on ? 'justify-end bg-[#34c759]' : 'justify-start bg-zinc-300'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 32 }}
        className="size-6 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.25)]"
      />
    </button>
  )
}

const stars = [
  [12, 8],
  [22, 22],
  [32, 10],
  [18, 30],
  [8, 20],
  [28, 28],
]

/** 昼 ↔ 夜: 太陽が月に変わり、雲が沈んで星が出る */
function DayNight() {
  const [night, setNight] = useState(false)
  return (
    <button
      role="switch"
      aria-checked={night}
      onClick={() => setNight(!night)}
      className="relative h-10 w-20 overflow-hidden rounded-full transition-colors duration-500"
      style={{ background: night ? '#1e293b' : '#7dd3fc', boxShadow: 'inset 0 2px 6px rgba(0,0,0,.3)' }}
    >
      {stars.map(([l, t], i) => (
        <span
          key={i}
          className="absolute size-[3px] rounded-full bg-white transition-opacity duration-500"
          style={{ left: l, top: t, opacity: night ? 1 : 0, transitionDelay: `${i * 60}ms` }}
        />
      ))}
      <span
        className="absolute bottom-1 right-2 h-3 w-8 rounded-full bg-white transition-transform duration-500"
        style={{ transform: night ? 'translateY(24px)' : 'none' }}
      />
      <span
        className="absolute bottom-3 right-5 size-4 rounded-full bg-white transition-transform duration-500"
        style={{ transform: night ? 'translateY(24px)' : 'none' }}
      />
      <motion.span
        className="absolute left-1 top-1 size-8 overflow-hidden rounded-full"
        animate={{
          x: night ? 40 : 0,
          backgroundColor: night ? '#e2e8f0' : '#facc15',
          boxShadow: night ? '0 0 12px rgba(226,232,240,.6)' : '0 0 14px rgba(250,204,21,.8)',
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        {[
          ['left-2 top-2 size-2'],
          ['left-4 top-5 size-1.5'],
          ['left-5 top-1.5 size-1'],
        ].map(([c], i) => (
          <motion.span
            key={i}
            animate={{ opacity: night ? 1 : 0 }}
            className={`absolute rounded-full bg-slate-400/70 ${c}`}
          />
        ))}
      </motion.span>
    </button>
  )
}

/** ネオン: border と glow の色が ON/OFF で切り替わる */
function Neon() {
  const [on, setOn] = useState(true)
  const c = on ? '#22d3ee' : '#f0abfc'
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className="relative flex h-9 w-20 items-center rounded-md border-2 px-1 transition-[border-color,box-shadow] duration-300"
      style={{ borderColor: c, boxShadow: `0 0 10px ${c}, inset 0 0 10px ${c}55` }}
    >
      <motion.span
        animate={{ x: on ? 36 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="h-6 w-8 rounded-sm"
        style={{ background: c, boxShadow: `0 0 14px ${c}` }}
      />
      <span
        className="absolute text-[10px] font-bold tracking-widest"
        style={{
          fontFamily: 'Orbitron, sans-serif',
          color: c,
          textShadow: `0 0 6px ${c}`,
          ...(on ? { left: 8 } : { right: 6 }),
        }}
      >
        {on ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}

/** チェックボックス: SVG パスを pathLength で「描く」 */
function CheckboxDraw() {
  const [checked, setChecked] = useState(true)
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => setChecked(!checked)}
      className="flex items-center gap-2 text-sm text-zinc-700"
    >
      <span className="relative size-7">
        <motion.span
          className="absolute inset-0 rounded-lg border-2"
          initial={false}
          animate={{
            backgroundColor: checked ? '#6366f1' : '#ffffff',
            borderColor: checked ? '#6366f1' : '#d4d4d8',
            scale: checked ? [1, 0.82, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
        />
        <svg viewBox="0 0 24 24" className="relative size-7 p-1" fill="none" stroke="white" strokeWidth={3}>
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0 }}
            transition={{ duration: 0.3, delay: checked ? 0.1 : 0 }}
          />
        </svg>
      </span>
      <span className="relative">
        通知を受け取る
        <motion.span
          className="absolute left-0 top-1/2 h-px w-full origin-left bg-zinc-400"
          initial={false}
          animate={{ scaleX: checked ? 0 : 1 }}
        />
      </span>
    </button>
  )
}

/** セグメントコントロール: 選択背景が layoutId でスライド */
function Segmented() {
  const opts = ['Light', 'Dark', 'Auto']
  const [v, setV] = useState('Dark')
  return (
    <div className="flex rounded-lg bg-zinc-200 p-0.5 text-xs">
      {opts.map((o) => (
        <button key={o} onClick={() => setV(o)} className="relative px-3 py-1.5">
          {v === o && (
            <motion.span
              layoutId="segment"
              className="absolute inset-0 rounded-md bg-white shadow-sm"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className={`relative ${v === o ? 'font-medium text-zinc-900' : 'text-zinc-500'}`}>{o}</span>
        </button>
      ))}
    </div>
  )
}

/** スキューモーフィズム: 金属ノブ + LED インジケーター */
function Skeuo() {
  const [on, setOn] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-3 rounded-full transition-all duration-300"
        style={{
          background: on ? 'radial-gradient(circle at 35% 35%,#bbf7d0,#22c55e)' : 'radial-gradient(circle at 35% 35%,#52525b,#18181b)',
          boxShadow: on ? '0 0 10px #22c55e, 0 0 2px #fff inset' : 'inset 0 1px 2px rgba(0,0,0,.7)',
        }}
      />
      <button
        role="switch"
        aria-checked={on}
        onClick={() => setOn(!on)}
        className="relative h-9 w-16 rounded-md p-1"
        style={{
          background: 'linear-gradient(#3f3f46,#18181b)',
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,.8), 0 1px 0 rgba(255,255,255,.6)',
        }}
      >
        <motion.span
          animate={{ x: on ? 28 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="flex h-7 w-7 items-center justify-center gap-[3px] rounded"
          style={{
            background: 'linear-gradient(180deg,#fafafa,#a1a1aa)',
            boxShadow: '0 2px 4px rgba(0,0,0,.6), inset 0 1px 0 #fff',
          }}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-3 w-px bg-zinc-500 shadow-[1px_0_0_#fff]" />
          ))}
        </motion.span>
      </button>
    </div>
  )
}

export function ToggleSwitches() {
  const gid = useId()
  return (
    <LayoutGroup id={gid}>
      <div className="@container relative h-full w-full overflow-hidden bg-zinc-200">
        <div className="grid h-full grid-cols-2 gap-2.5 overflow-y-auto p-2.5 @2xl:grid-cols-3">
          <Cell label="iOS · layout" className="bg-white text-zinc-700">
            <IOSSwitch />
          </Cell>
          <Cell label="Day / Night" className="bg-sky-50 text-sky-900">
            <DayNight />
          </Cell>
          <Cell label="Neon" className="bg-zinc-950 text-cyan-200">
            <Neon />
          </Cell>
          <Cell label="SVG draw" className="bg-white text-zinc-700">
            <CheckboxDraw />
          </Cell>
          <Cell label="Segmented · layoutId" className="bg-zinc-50 text-zinc-700">
            <Segmented />
          </Cell>
          <Cell label="Skeuomorphic" className="bg-gradient-to-b from-zinc-200 to-zinc-400 text-zinc-800">
            <Skeuo />
          </Cell>
        </div>
      </div>
    </LayoutGroup>
  )
}
