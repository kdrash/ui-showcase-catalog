import { useState } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'

/**
 * Minimal
 * 背景 #fafafa / カード #fff / 1px ボーダー #e5e5e5 / 角丸 12px / 影はほぼ無し。
 * アクセントは黒 #0a0a0a のみ。トランジションは 150ms 程度で控えめに。
 */
const STATS = [
  ['128', 'Posts'],
  ['2.4k', 'Followers'],
  ['312', 'Following'],
] as const

export function StyleMinimal() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(62)
  const [following, setFollowing] = useState(false)

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[#fafafa] font-sans text-[#0a0a0a]">
      <div className="w-[300px] rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {/* header */}
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[#f4f4f5] text-sm font-medium text-[#404040]">
            MS
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold tracking-tight">Mika Sato</p>
            <p className="text-xs text-[#737373]">Product Designer · Tokyo</p>
          </div>
          <span className="rounded-full border border-[#e5e5e5] px-2 py-0.5 text-[10px] text-[#737373]">Pro</span>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-3 border-y border-[#f0f0f0] py-3 text-center">
          {STATS.map(([value, label], i) => (
            <div key={label} className={i > 0 ? 'border-l border-[#f0f0f0]' : ''}>
              <p className="text-[15px] font-semibold tabular-nums">{value}</p>
              <p className="text-[11px] text-[#a3a3a3]">{label}</p>
            </div>
          ))}
        </div>

        {/* toggle */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[13px] text-[#404040]">Notifications</span>
          <button
            role="switch"
            aria-checked={notify}
            aria-label="Notifications"
            onClick={() => setNotify((v) => !v)}
            className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${notify ? 'bg-[#0a0a0a]' : 'bg-[#e5e5e5]'}`}
          >
            <motion.span
              className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
              animate={{ x: notify ? 16 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          </button>
        </div>

        {/* slider: 透明な input[type=range] を見た目の上に重ねる */}
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-[13px]">
            <span className="text-[#404040]">Volume</span>
            <span className="tabular-nums text-[#737373]">{volume}%</span>
          </div>
          <div className="relative h-4">
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[#e5e5e5]" />
            <div
              className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[#0a0a0a]"
              style={{ width: `${volume}%` }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-[#0a0a0a] bg-white transition-[scale,box-shadow] peer-focus-visible:ring-4 peer-focus-visible:ring-black/10 peer-active:scale-125"
              style={{ left: `calc(${volume}% - ${volume * 0.14}px)` }}
            />
          </div>
        </div>

        {/* input */}
        <input
          placeholder="Set a status…"
          className="mt-4 h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] text-[#0a0a0a] outline-none transition placeholder:text-[#a3a3a3] focus:border-[#0a0a0a] focus:ring-4 focus:ring-black/5"
        />

        {/* buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setFollowing((f) => !f)}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0a0a0a] text-[13px] font-medium text-white transition hover:bg-[#262626] active:scale-[0.98]"
          >
            {following && <Check size={14} />}
            {following ? 'Following' : 'Follow'}
          </button>
          <button className="h-9 rounded-lg border border-[#e5e5e5] bg-white text-[13px] font-medium text-[#0a0a0a] transition hover:bg-[#f5f5f5] active:scale-[0.98]">
            Message
          </button>
        </div>
      </div>
    </div>
  )
}
