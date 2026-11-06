import { useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { Bell, Check } from 'lucide-react'

/**
 * Glassmorphism
 * カラフルなぼかしブロブの上に、半透明 + backdrop-filter: blur のカードを重ねる。
 * ポイントは「背景に色があること」「白い 1px の半透明ボーダー」「内側上辺のハイライト」。
 */
const glassPanel: CSSProperties = {
  background: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.25)',
  boxShadow: '0 8px 32px rgba(31,38,135,0.37), inset 0 1px 0 rgba(255,255,255,0.35)',
}

const STATS = [
  ['128', 'Posts'],
  ['2.4k', 'Followers'],
  ['312', 'Following'],
] as const

function Blob({ className, color, duration, delay = 0 }: { className: string; color: string; duration: number; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full ${className}`}
      style={{ background: color, filter: 'blur(36px)', opacity: 0.75 }}
      animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0], scale: [1, 1.1, 0.95, 1] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export function StyleGlass() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(70)
  const [following, setFollowing] = useState(false)

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden font-sans text-white"
      style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#0f172a 100%)' }}
    >
      <Blob className="left-[6%] top-[4%] h-48 w-48" color="#ec4899" duration={11} />
      <Blob className="right-[2%] top-[28%] h-44 w-44" color="#8b5cf6" duration={13} delay={1} />
      <Blob className="bottom-[2%] left-[18%] h-48 w-48" color="#06b6d4" duration={9} delay={2} />
      <Blob className="bottom-[24%] right-[18%] h-24 w-24" color="#f59e0b" duration={12} delay={0.5} />

      <div className="relative w-[300px] rounded-3xl p-5" style={glassPanel}>
        {/* header */}
        <div className="flex items-center gap-3">
          <div
            className="rounded-full p-[2px]"
            style={{ background: 'conic-gradient(from 180deg, #f472b6, #a78bfa, #22d3ee, #f472b6)' }}
          >
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#2a2563] text-sm font-semibold">MS</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">Mika Sato</p>
            <p className="text-xs text-white/60">Product Designer · Tokyo</p>
          </div>
          <button
            aria-label="Notifications"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/10 transition hover:bg-white/20"
          >
            <Bell size={14} />
          </button>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {STATS.map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-white/15 bg-white/10 py-2 text-center">
              <p className="text-[15px] font-semibold tabular-nums">{value}</p>
              <p className="text-[10px] text-white/60">{label}</p>
            </div>
          ))}
        </div>

        {/* toggle */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[13px] text-white/80">Notifications</span>
          <button
            role="switch"
            aria-checked={notify}
            aria-label="Notifications"
            onClick={() => setNotify((v) => !v)}
            className="relative h-6 w-11 rounded-full border border-white/30 transition-colors duration-300"
            style={{ background: notify ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)' }}
          >
            <motion.span
              className="absolute left-[3px] top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
              animate={{ x: notify ? 19 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            />
          </button>
        </div>

        {/* slider */}
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-[13px]">
            <span className="text-white/80">Volume</span>
            <span className="tabular-nums text-white/60">{volume}%</span>
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
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/20" />
            <div
              className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
              style={{ width: `${volume}%`, background: 'linear-gradient(90deg, rgba(255,255,255,0.35), #ffffff)' }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-[scale] peer-active:scale-110"
              style={{
                left: `calc(${volume}% - ${volume * 0.16}px)`,
                boxShadow: '0 0 0 4px rgba(255,255,255,0.25), 0 0 16px rgba(255,255,255,0.8)',
              }}
            />
          </div>
        </div>

        {/* input */}
        <input
          placeholder="What's on your mind?"
          className="mt-4 h-10 w-full rounded-xl border border-white/20 bg-white/10 px-3.5 text-[13px] text-white outline-none transition placeholder:text-white/50 focus:border-white/50 focus:bg-white/15"
        />

        {/* buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setFollowing((f) => !f)}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white text-[13px] font-semibold text-[#312e81] shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition hover:bg-white/90 active:scale-[0.97]"
          >
            {following && <Check size={14} />}
            {following ? 'Following' : 'Follow'}
          </button>
          <button className="h-10 rounded-xl border border-white/25 bg-white/10 text-[13px] font-semibold text-white transition hover:bg-white/20 active:scale-[0.97]">
            Message
          </button>
        </div>
      </div>
    </div>
  )
}
