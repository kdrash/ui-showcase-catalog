import { useState } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'

/**
 * Aurora / Gradient Glow
 * 夜空 #050816 にオーロラの帯 (ぼかした細長いグラデーション + mix-blend-mode: screen) をゆっくり揺らす。
 * カードは 1px のグラデーション枠 + 背後に同じグラデの大きなぼかしグロー。
 * アクセントはエメラルド #34d399 → シアン #22d3ee → バイオレット #a78bfa → ピンク #f472b6。
 */
const AURORA = 'linear-gradient(90deg,#34d399,#22d3ee,#a78bfa,#f472b6)'

function Ribbon({ className, background, duration, delay = 0 }: { className: string; background: string; duration: number; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-[50%] ${className}`}
      style={{ background, filter: 'blur(42px)', mixBlendMode: 'screen' }}
      animate={{ rotate: [-8, 5, -8], y: [0, 18, 0], scaleY: [1, 1.35, 1], opacity: [0.45, 0.7, 0.45] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export function StyleAurora() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(58)
  const [following, setFollowing] = useState(false)

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden font-sans text-white" style={{ background: '#050816' }}>
      {/* stars */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 12% 20%, #fff, transparent), radial-gradient(1px 1px at 72% 14%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 8%, #fff, transparent), radial-gradient(1px 1px at 88% 40%, #fff, transparent), radial-gradient(1px 1px at 22% 62%, #fff, transparent), radial-gradient(1px 1px at 60% 86%, #fff, transparent), radial-gradient(1.5px 1.5px at 94% 82%, #fff, transparent)',
        }}
      />
      <Ribbon className="-left-[20%] -top-[12%] h-[55%] w-[140%]" background="linear-gradient(90deg,transparent,#34d399 30%,#22d3ee 60%,transparent)" duration={14} />
      <Ribbon className="-right-[25%] top-[18%] h-[40%] w-[120%]" background="linear-gradient(90deg,transparent,#8b5cf6 35%,#a78bfa 60%,transparent)" duration={17} delay={2} />
      <Ribbon className="-left-[10%] bottom-[-8%] h-[38%] w-[110%]" background="linear-gradient(90deg,transparent,#f472b6 40%,#22d3ee 75%,transparent)" duration={19} delay={4} />

      <div className="relative">
        {/* glow behind card */}
        <div className="absolute -inset-5 rounded-[32px] opacity-40 blur-2xl" style={{ background: AURORA }} />
        {/* 1px gradient border */}
        <div
          className="relative rounded-[22px] p-px"
          style={{ background: 'linear-gradient(135deg, rgba(110,231,183,0.85), rgba(167,139,250,0.55) 50%, rgba(244,114,182,0.85))' }}
        >
          <div className="w-[300px] rounded-[21px] p-5" style={{ background: 'linear-gradient(180deg, rgba(10,14,32,0.92), rgba(6,9,22,0.96))' }}>
            {/* header */}
            <div className="flex items-center gap-3">
              <div className="relative grid h-12 w-12 place-items-center">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'conic-gradient(#34d399,#22d3ee,#a78bfa,#f472b6,#34d399)' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative grid h-[42px] w-[42px] place-items-center rounded-full bg-[#0a0f24] text-sm font-semibold">MS</div>
              </div>
              <div>
                <p
                  className="text-base font-bold"
                  style={{ backgroundImage: 'linear-gradient(90deg,#6ee7b7,#a5b4fc,#f9a8d4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
                >
                  Mika Sato
                </p>
                <p className="text-xs text-[#94a3b8]">Product Designer · Tokyo</p>
              </div>
            </div>

            {/* stats */}
            <div className="mt-4 grid grid-cols-3 text-center">
              {[
                ['128', 'Posts'],
                ['2.4k', 'Followers'],
                ['312', 'Following'],
              ].map(([value, label], i) => (
                <div key={label} className="relative">
                  {i > 0 && (
                    <span className="absolute left-0 top-1/2 h-7 w-px -translate-y-1/2" style={{ background: 'linear-gradient(transparent,#a78bfa,transparent)' }} />
                  )}
                  <p className="text-[15px] font-semibold tabular-nums">{value}</p>
                  <p className="text-[11px] text-[#94a3b8]">{label}</p>
                </div>
              ))}
            </div>

            {/* toggle */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[13px] text-[#cbd5e1]">Notifications</span>
              <button
                role="switch"
                aria-checked={notify}
                aria-label="Notifications"
                onClick={() => setNotify((v) => !v)}
                className="relative h-6 w-11 rounded-full transition-shadow duration-300"
                style={{
                  background: notify ? 'linear-gradient(90deg,#34d399,#a78bfa)' : '#1e293b',
                  boxShadow: notify ? '0 0 16px rgba(167,139,250,0.55)' : 'none',
                }}
              >
                <motion.span
                  className="absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white"
                  animate={{ x: notify ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* slider */}
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-[13px]">
                <span className="text-[#cbd5e1]">Volume</span>
                <span className="tabular-nums text-[#94a3b8]">{volume}%</span>
              </div>
              <div className="relative h-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
                <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#1e293b]" />
                <div
                  className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                  style={{ width: `${volume}%`, background: 'linear-gradient(90deg,#34d399,#22d3ee,#a78bfa)' }}
                />
                <div
                  className="absolute top-0 h-4 w-4 rounded-full bg-white"
                  style={{ left: `calc(${volume}% - ${volume * 0.16}px)`, boxShadow: '0 0 12px rgba(167,139,250,0.9)' }}
                />
              </div>
            </div>

            {/* input */}
            <input
              placeholder="Share a thought…"
              className="mt-4 h-10 w-full rounded-xl border border-[#1e293b] bg-[#0b1226] px-3.5 text-[13px] text-white outline-none transition placeholder:text-[#475569] focus:border-[#a78bfa] focus:shadow-[0_0_0_3px_rgba(167,139,250,0.25)]"
            />

            {/* buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setFollowing((f) => !f)}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[length:200%_100%] bg-left text-[13px] font-semibold text-[#04111d] shadow-[0_8px_24px_-6px_rgba(167,139,250,0.6)] transition-[background-position] duration-500 hover:bg-right active:scale-[0.98]"
                style={{ backgroundImage: 'linear-gradient(90deg,#34d399,#22d3ee,#a78bfa,#f472b6)' }}
              >
                {following && <Check size={14} />}
                {following ? 'Following' : 'Follow'}
              </button>
              <button className="h-10 rounded-xl border border-white/10 text-[13px] font-semibold text-[#e2e8f0] transition hover:bg-white/5 active:scale-[0.98]">
                Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
