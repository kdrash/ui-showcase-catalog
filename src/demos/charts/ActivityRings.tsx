import { useState } from 'react'
import { motion } from 'motion/react'
import NumberFlow from '@number-flow/react'

const DAYS = ['月', '火', '水', '木', '金', '土', '日']
// [ムーブ kcal, エクササイズ 分, スタンド 時間]
const DATA: [number, number, number][] = [
  [420, 34, 10],
  [610, 52, 12],
  [380, 18, 8],
  [520, 41, 11],
  [690, 65, 13],
  [250, 12, 6],
  [480, 30, 9],
]
const RINGS = [
  { key: 'move', label: 'ムーブ', unit: 'kcal', goal: 500, from: '#fa114f', to: '#ff6b9a', bg: 'rgba(250,17,79,0.2)' },
  { key: 'exercise', label: 'エクササイズ', unit: '分', goal: 30, from: '#92e82a', to: '#d3ff59', bg: 'rgba(146,232,42,0.2)' },
  { key: 'stand', label: 'スタンド', unit: '時間', goal: 12, from: '#1eeaef', to: '#7bf6ff', bg: 'rgba(30,234,239,0.2)' },
]

function Rings({ values, size, stroke, gap, id, animate = true }: { values: number[]; size: number; stroke: number; gap: number; id: string; animate?: boolean }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <defs>
        {RINGS.map((r) => (
          <linearGradient key={r.key} id={`${id}-${r.key}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={r.from} />
            <stop offset="1" stopColor={r.to} />
          </linearGradient>
        ))}
      </defs>
      {RINGS.map((r, i) => {
        const rad = size / 2 - stroke / 2 - i * (stroke + gap)
        const p = values[i]
        return (
          <g key={r.key}>
            <circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke={r.bg} strokeWidth={stroke} />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={rad}
              fill="none"
              stroke={`url(#${id}-${r.key})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              initial={animate ? { pathLength: 0 } : false}
              animate={{ pathLength: Math.min(p, 1) }}
              transition={{ type: 'spring', stiffness: 40, damping: 14, delay: animate ? i * 0.12 : 0 }}
            />
            {/* 100% 超えは2周目を重ねる(影付き) */}
            {p > 1 && (
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={rad}
                fill="none"
                stroke={r.to}
                strokeWidth={stroke}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 ${stroke / 3}px rgba(0,0,0,.8))` }}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: Math.min(p - 1, 0.98) }}
                transition={{ type: 'spring', stiffness: 40, damping: 14, delay: 0.5 + i * 0.12 }}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Apple Watch 風のアクティビティリング(SVG + Motion pathLength + NumberFlow) */
export function ActivityRings() {
  const [day, setDay] = useState(4)
  const v = DATA[day]
  const ratios = v.map((x, i) => x / RINGS[i].goal)

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black p-4 text-white">
      <div className="flex min-h-0 flex-1 items-center justify-center gap-6">
        <div className="relative shrink-0">
          <Rings key={day} values={ratios} size={190} stroke={20} gap={4} id="big" />
        </div>
        <div className="flex flex-col gap-3">
          {RINGS.map((r, i) => (
            <div key={r.key}>
              <div className="text-[12px] font-medium text-zinc-300">{r.label}</div>
              <div className="text-2xl leading-tight font-bold tabular-nums" style={{ color: r.from }}>
                <NumberFlow value={v[i]} />
                <span className="text-base text-zinc-400">
                  /{r.goal}
                  <span className="ml-0.5 text-xs">{r.unit}</span>
                </span>
              </div>
              <div className="text-[10.5px] text-zinc-500">
                <NumberFlow value={ratios[i]} format={{ style: 'percent' }} /> 達成
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {DAYS.map((d, i) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(i)}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition ${i === day ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <Rings values={DATA[i].map((x, k) => x / RINGS[k].goal)} size={30} stroke={3.5} gap={1} id={`d${i}`} animate={false} />
            <span className={`text-[10px] ${i === day ? 'font-semibold text-white' : 'text-zinc-500'}`}>{d}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
